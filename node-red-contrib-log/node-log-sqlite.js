'use strict';

const fs      = require('fs');
const helper  = require('node-red-viseo-helper');
const sqlite3 = require('sqlite3').verbose();

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        setup(RED, node, config);
        this.on('input', (data) => { input(node, data, config)  });
        this.on('close', (done) => { close(done) });
    }
    RED.nodes.registerType("log-sqlite", register, {});
}

let DB = undefined;
const setup = (RED, node, config) => {
    if (DB !== undefined) return;
    let file = helper.resolve(config.database, undefined, config.database);
    if (!fs.existsSync(file)){
        return node.error('Missing database: ' + file)
    }
    DB = new sqlite3.Database(file);
}

const close = (done) => {
    DB = undefined;
    done();
}

const input = (node, data, config) => {
    let log = config.log || 'payload';
        log = helper.getByString(data, log, log);

    let where   = config.where;
    let params  = {};
    let keys    = '';
    let values  = '';
    let sets    = '';
    for (let key of Object.keys(log)){
        params['$'+key] = JSON.stringify(log[key]);
        keys   +=       key + ','
        values += '$' + key + ','
        sets   += key + '=' + '$' + key + ','
    }

    let sql = config.cmd + ' ' + config.table 
    if (config.cmd.indexOf('UPDATE') == 0){
        sql += ' SET ' + sets.substring(0, sets.length-1)
        if (where) sql += ' WHERE ' + where + '=$' + where
    } else {
        sql += '('+ keys.substring(0, keys.length-1) +') '
            + 'VALUES('+ values.substring(0, values.length-1) +');'
    }

    DB.run(sql, params, (err, rows) => {
        if (err){ return node.error(err); }
        node.send(data);
    });
    
}
