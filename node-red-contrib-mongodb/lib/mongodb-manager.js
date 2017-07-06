'use strict';
const DatabaseManager = require('node-red-viseo-nosql-manager');
const MongoClient   = require('mongodb').MongoClient;

class MongoDBManager extends DatabaseManager {

    constructor(node) {
        super();
        this.db = null;
        this._init(node);
    }

    get key() {
        return this.host + '_' + this.database;
    }

    get database() {
    	return _database;
    }

    getStatus(config) {
    	let error = '';
        if(!this.host) {
            error = 'Missing host for MongoDB server';
        } else if(!this.port) {
            error = 'Missing port for Mongo server';
        } else if(!this._database) {
            error = 'Missing database name for Mongo connection';
        } else if(config && !config.collection) {
            error = 'Missing collection name for Mongo request';
        } else if(!this.user) {
            error = 'Missing user name for Mongo connection';
        } else if(!this.password) {
            error = 'Missing password for Mongo connection';
        }

        return error;
    }

    _init(node) {

        this.host = node.credentials.host;
        this.port = node.credentials.port;
        this._database = node.database;
        this.user = node.credentials.user;
        this.password = node.credentials.password;


		if(this.db === null && this.getStatus() === '') {

            this.url =  'mongodb://'+node.credentials.user+':'+encodeURIComponent(node.credentials.password)
                    +'@'+node.credentials.host+':'+node.credentials.port+'/'+node.database;
            let manager = this;

                //CONNECT DATABASE
            MongoClient.connect(this.url, function(err, db) {

                if(err === null) {
                    manager.db = db;
                    info("Connected to database "+manager.url);
                } else {
                    error(err);
                    node.warn("Could not connect to database "+manager.url);
                }
            });
        }
    }

    end(callback) {
    	if(this.db !== null) {

	        this.db.close();
	    	this.db = null;
	        info('mongoDB connection to '+this.url+' stopped.');
	 
    	}
    	callback();
    }

    find(key, data, config, callback) { 
	    var collection = this.db.collection(config.collection);
	    collection.find(key).toArray(function(err, documents) {
	    	callback(err, data, documents);
	    });
	}

   

};

module.exports = MongoDBManager;
// ------------------------------------------
//  GET / SET / ADD / UPDATE / DELETE / FIND
// ------------------------------------------

/*
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

}*/
