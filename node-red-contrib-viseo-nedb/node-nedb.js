const Datastore = require('nedb');
const extend  = require('extend');
const path = require('path');
const vm = require('vm');


const getByString = (obj, str) => {
    let ctxt = { "data": obj , "value": undefined };
    const context = new vm.createContext(ctxt);
    const script  = new vm.Script("value = data."+str);
    try { script.runInContext(context); }
    catch(ex){ error(ex.message); }
    return ctxt.value;
}

const setByString = (obj, str, value) => {
    let ctxt = { "data": obj };
    const context = new vm.createContext(ctxt);
    const script  = new vm.Script("data."+str+"="+value);
    try { script.runInContext(context); }
    catch(ex){ error(ex.message); }
}

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
    let dbPath = config.path || '/data/database.db';
    let file   = path.normalize(process.cwd() + dbPath);

    db = new Datastore({ filename: file });
    db.loadDatabase((err) => { node.log('Loading DataBase:' + file); });
}

const input = (node, data, config) => {
    config.operation === 'set' ? set(node, data, config)
                               : get(node, data, config);
}

const set = (node, data, config) => {
    let dbKey = getByString(data, config.key);
    let value = getByString(data, config.value);
    if (!value) return;
    
    value.mdate = Date.now(); 
    db.update({ id: dbKey }, value, { upsert: true }, function (err, numReplaced, upsert) {
        node.send(data);
    });
}

const get = (node, data, config) => {
    let dbKey = getByString(data, config.key);
    if (!dbKey) return node.send(data);

    db.findOne({ id: dbKey }, (err, doc) => {
        let value = getByString(data, config.value);
        if (value) extend(true, value, doc);
        else setByString(data, config.value, doc);
        node.send(data);
    });
}
