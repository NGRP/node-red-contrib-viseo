const helper    = require('node-red-viseo-helper');
const Datastore = require('nedb');
const extend    = require('extend');
const path      = require('path');
const vm        = require('vm');

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

let db = undefined;
const stop = (callback) => { db = undefined; callback(); }
const start = (node, config) => {
    if (db) return;
    let dbPath = helper.resolve(config.path || '{cwd}/data/database.db', undefined, '');
    let file   = path.normalize(dbPath);
    
    db = new Datastore({ filename: file });
    db.loadDatabase((err) => { node.log('Loading DataBase:' + file); });
}

const input = (node, data, config) => {
    try {
         if (config.operation === 'set')  set(node, data, config)
    else if (config.operation === 'get')  get(node, data, config)
    else if (config.operation === 'find') find(node, data, config)
    } catch (ex) {console.log(ex)}
}

const set = (node, data, config) => {
    let dbKey = helper.getByString(data, config.key);
    let value = helper.getByString(data, config.value);
    if (!value) return;
    
    value.id = dbKey;
    value.mdate = Date.now(); 
    db.update({ id: dbKey }, value, { upsert: true }, function (err, numReplaced, upsert) {
        if (err) return node.error(err);
        node.send(data);
    });
}

const get = (node, data, config) => {
    let dbKey = helper.getByString(data, config.key);
    if (!dbKey) return node.send(data);

    db.findOne({ id: dbKey }, (err, doc) => { console.log(doc)
        if (err) return node.error(err);
        let value = helper.getByString(data, config.value);

        // Set the value property to the DB object
        if (value && (typeof value) === 'object') extend(true, value, doc);
        else helper.setByString(data, config.value, doc);
        node.send(data);
    });
}

const find = (node, data, config) => { 
    // Kludge test to avoid logs exception for inline JSON
    let dbKey = config.key;
    if (dbKey.indexOf('{') != 0) 
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
