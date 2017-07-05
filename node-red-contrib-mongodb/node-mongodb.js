'use strict';

const helper        = require('node-red-viseo-helper');
const MongoClient   = require('mongodb').MongoClient;
const extend        = require('extend');

// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------

let info  = console.log;
let error = console.log;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    info  = RED.log.info;
    error = RED.log.error;

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;


        if(!node.credentials.host) {
            return node.status({fill:"red", shape:"ring", text: 'Missing host for MongoDB server'});
        }
        if(!node.credentials.port) {
            return node.status({fill:"red", shape:"ring", text: 'Missing port'});
        }
        if(!config.database) {
            return node.status({fill:"red", shape:"ring", text: 'Missing database name'});
        }
        if(!config.collection) {
            return node.status({fill:"red", shape:"ring", text: 'Missing collection name'});
        }
        if(!node.credentials.user) {
            return node.status({fill:"red", shape:"ring", text: 'Missing user name'});
        }
        if(!node.credentials.password) {
            return node.status({fill:"red", shape:"ring", text: 'Missing password'});
        }

        node.status({});

        node.database = config.database;

        // Connection URL
        node.url =  'mongodb://'+node.credentials.user+':'+encodeURIComponent(node.credentials.password)
                    +'@'+node.credentials.host+':'+node.credentials.port+'/'+config.database;

        node.collection = config.collection;  

        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', (cb)    => { stop(node, cb, config)  });
    }
    RED.nodes.registerType("mongodb", register, {
        credentials: {
            host:      { type: "text" },
            port:      { type: "text" },
            user:      { type: "text" },
            password:  { type: "text" } 
        }
    });
}

let CACHE = {};



const stop = (node, cb, config) => {
    let key = resolveKey(node);

    //CLOSE DATABASE
    if(CACHE[key]) {
        CACHE[key].close();
        CACHE[key] = undefined;

        info('mongoDB connection to '+node.url+' stopped.');
    }
    cb();
}


const input = (node, data, config) => {
    let key = resolveKey(node);
    let db   = CACHE[key];
    let queryDB = function(db) {
        try {

            switch(config.operation) {
                case 'set':
                    set(node, data, config, db);
                    break;
                case 'get':
                    get(node, data, config, db);
                    break;
                case 'find':
                    find(node, data, config, db);
                    break;
                case 'update':
                    update(node, data, config, db);
                    break;
                case 'add':
                    add(node, data, config, db);
                    break;
                case 'delete':
                    remove(node, data, config, db);
            }

        } catch (ex) { 
            node.log(ex.message) 
        }
    };


    if (db){
        queryDB(db);
        return;
    }

    //CONNECT DATABASE
    MongoClient.connect(node.url, function(err, db) {

        if(err === null) {
            CACHE[key] = db;
            queryDB(db);
        } else {
            error(err);
            node.warn("Could not connect to database "+node.url);
            node.send(data);
        }
    });


    
}

const resolveKey = (node) => {
    
    return node.credentials.host + '_' + node.database;
}


// ------------------------------------------
//  GET / SET / ADD / UPDATE / DELETE / FIND
// ------------------------------------------

const get = (node, data, config, db) => {
    let dbKey = helper.getByString(data, config.key, config.key);
    if (!dbKey) {
        node.warn('No id Found. Do nothing');
        return node.send(data);
    }

    var collection = db.collection(node.collection);
    collection.findOne({ id: dbKey }, (err, document) => { 
        if (err) {
            return error(err);
        }
        if (!document) return node.send(data);
        
        if (config.merge){
            let value = helper.getByString(data, config.value);
            if (value && (typeof value) === 'object') extend(true, value, document);
            return node.send(data)
        }

        helper.setByString(data, config.value, document);
        node.send(data);
    });
}

const set = (node, data, config, db) => {

    let dbKey = helper.getByString(data, config.key);
    let value = helper.getByString(data, config.value);
    
    if (!value) {
        return error('No values: '+ config.value);
    }
    
    value.id = dbKey;
    value.mdate = Date.now(); 

    var collection = db.collection(node.collection);

    collection.updateOne({ id: dbKey }, { $set: value }, { upsert: true }, function (err, result) {
        if(err) {
            error(err);
        }
        data.payload = result;      
        node.send(data);
    });
}

const update = (node, data, config, db) => {

    let value = helper.getByString(data, config.value);
    let dbKey = config.key;
    
    if (dbKey.indexOf('{') !== 0) {
        dbKey = helper.getByString(data, config.key);
    }
    
    if (!value) {
        node.warn('No values: '+ config.value);
        node.send(data);
        return;
    }

    var collection = db.collection(node.collection);

    collection.updateOne(dbKey, { $set: value }, { upsert: true }, function(err, result) {
        if(err) {
            error(err);
        }
        data.payload = result;      
        node.send(data);
    });
}

const find = (node, data, config, db) => { 
    // Kludge test to avoid logs exception for inline JSON
    
    let dbKey = config.key;
    if (dbKey.indexOf('{') !== 0) {
        dbKey = helper.getByString(data, config.key || 'payload');
    }

    if (typeof dbKey === 'string'){
        dbKey = JSON.parse(dbKey);
    }
    if (!dbKey) {
        node.warn('No condition found for search. Do Nothing.');
        return node.send(data);
    }

    var collection = db.collection(node.collection);

    collection.find(dbKey).toArray(function(err, documents) { 
        if (err) return node.error(err);

        helper.setByString(data, config.value || 'payload', documents);
        node.send(data);
    });
}

const add = (node, data, config, db) => {
    // Get the documents collection
    let collection = db.collection(node.collection);

    let value = helper.getByString(data, config.value);
    //check value
    if(Array.isArray(value) && typeof value[0] === "object" && value !== null) {
        // Insert some documents
        collection.insertMany(value, function(err, result) {

            if(err) {
                error(err);
            }
            data.payload = result;      
            node.send(data);
        });
    } else {
        node.warn("Could not insert value. Operation ignored");
        node.send(data);
    }
}


const remove = (node, data, config, db) => {
    // Get the documents collection
    let collection = db.collection(node.collection);
    let dbKey = config.key;
    if (dbKey.indexOf('{') !== 0) {
        dbKey = helper.getByString(data, config.key || 'payload');
    }

    collection.deleteOne(dbKey, function(err, result) {
        if(err) {
            error(err);
        }
        data.payload = result;      
        node.send(data);
    });    

}
