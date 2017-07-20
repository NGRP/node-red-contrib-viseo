'use strict';

const NeDBManager = require('./lib/nedb-manager.js');
const dbRegistry = require('node-red-contrib-viseo-nosql-manager').dbRegistry;
const helper   = require('node-red-viseo-helper');

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

        this.xlsx = config.xlsx;
        
        let dbPath = helper.resolve(config.path || '{cwd}/data/database.db', undefined, '');
        this.path = dbPath; 

        this.databaseManager = new NeDBManager(this);

        this.on('close', (cb)    => { this.databaseManager.end(cb);  });
    }

    RED.nodes.registerType("nedb", register, {});

    dbRegistry.register(NeDBManager);
}
