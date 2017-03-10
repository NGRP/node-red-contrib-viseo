const helper    = require('node-red-viseo-helper');
const Datastore = require('nedb');
const extend    = require('extend');
const path      = require('path');
const xlsx      = require('node-xlsx')

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

        start(node, config);
        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', stop);
    }
    RED.nodes.registerType("nedb", register, {});
}

let CACHE = {};

const resolvePath = (str) => {
    let dbPath = helper.resolve(str || '{cwd}/data/database.db', undefined, '');
    let file   = path.normalize(dbPath);
    return file;
}

const stop = (callback) => {
    let file = resolvePath(config.path);
    if (file) CACHE[file] = undefined;
    callback();
}

const start = (node, config) => {
    let file = resolvePath(config.path);
    if (CACHE[file]) return;
    
    // DB Configuration
    let dbconf = { 'filename': file }
    let callback = undefined;

    if (config.xlsx){
        dbconf.inMemoryOnly = true;
        delete dbconf.filename;

        let tab  = parseInt(config.xlsx);
        let rows = xlsx2json(file, tab);
        callback = (db) => {
            db.insert(rows, function (err, newDocs) { 
                if (err){ error(err); } 
                node.log('Inserting ' + newDocs.length + ' documents');
            });
        }
    }

    // Create Database
    let db = new Datastore(dbconf);
    db.loadDatabase((err) => {
        if (err) { return node.error(err); }
        node.log('Loading DataBase:' + file);
        CACHE[file] = db;
        if (callback) callback(db)
    });
}

const input = (node, data, config) => {
    let file = resolvePath(config.path);
    let db   = CACHE[file];

    if (!db){
        node.log('Error with database, moving on');
        return node.send(data);
    }

    try {

         if (config.operation === 'set')   set(node, data, config, db)
    else if (config.operation === 'get')   get(node, data, config, db)
    else if (config.operation === 'find') find(node, data, config, db)

    } catch (ex) { node.log(ex.message) }
}

// ------------------------------------------
//  XLSX TO JSON
// ------------------------------------------

const xlsx2json = (inputFile, tabIndex) => {

    let workbook = xlsx.parse(inputFile);
    let sheet    = workbook[tabIndex].data;

    let first = undefined;
    let cptId = 0;
    let json  = [];
    for (let row of sheet){
        if (first === undefined){ first = row; continue; }
        if (row[0] === undefined){ continue;} // Skip (quick) empty lines

        let obj = { '_id' : '' + (cptId++) }; // Generate an NeDB id
        for(let i = 0 ; i < first.length ; i++){
            obj[first[i]] = row[i]; 
        }
        json.push(obj)
    }
    return json
}

// ------------------------------------------
//  GET / SET / FIND
// ------------------------------------------

const set = (node, data, config, db) => {
    let dbKey = helper.getByString(data, config.key);
    let value = helper.getByString(data, config.value);
    
    if (!value) return node.error(new Error('No values: '+ config.value));
    
    value.id = dbKey;
    value.mdate = Date.now(); 
    db.update({ id: dbKey }, value, { upsert: true }, function (err, numReplaced, upsert) {
        if (err) return node.error(err);
        node.send(data);
    });
}

const get = (node, data, config, db) => {
    let dbKey = helper.getByString(data, config.key);
    if (!dbKey) return node.send(data);

    db.findOne({ id: dbKey }, (err, doc) => { 
        if (err) return node.error(err);
        let value = helper.getByString(data, config.value);

        if (value && (typeof value) === 'object') extend(true, value, doc);
        else helper.setByString(data, config.value, doc);
        node.send(data);
    });
}

const find = (node, data, config, db) => { 
    // Kludge test to avoid logs exception for inline JSON
    let dbKey = config.key;
    if (dbKey.indexOf('{') !== 0) 
        dbKey = helper.getByString(data, config.key);

    if (!dbKey) return node.send(data);
     
    if (typeof dbKey === 'string'){
        dbKey = JSON.parse(dbKey);
    }

    db.find(dbKey, (err, docs) => { 
        if (err) return node.error(err);
        helper.setByString(data, config.value, docs);
        node.send(data);
    });
}
