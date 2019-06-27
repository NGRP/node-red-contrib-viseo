'use strict';

const NeDBManager = require('./lib/nedb-manager.js');
const dbRegistry = require('node-red-contrib-viseo-nosql-manager').dbRegistry;
const helper   = require('node-red-viseo-helper');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    
    const register = function(config) {
        RED.nodes.createNode(this, config);

        this.xlsx = config.xlsx;
        
        let dbPath = helper.resolve(config.path || '{cwd}/data/database.db', undefined, '');
        this.path = dbPath; 

        this.databaseManager = new NeDBManager(RED, this);

        this.on('close', (cb)    => { this.databaseManager.end(cb);  });
    }

    RED.nodes.registerType("nedb", register, {});

    dbRegistry.register(NeDBManager);
}
