'use strict';

const MongoDBManager = require('./lib/mongodb-manager.js');
const databaseRegistry = require('node-red-viseo-nosql-manager').dbRegistry;


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

        this.database = config.database;
        this.databaseManager = new MongoDBManager(this);
    }

    databaseRegistry.register(MongoDBManager);

    RED.nodes.registerType("mongodb", register, {
        credentials: {
            host:      { type: "text" },
            port:      { type: "text" },
            user:      { type: "text" },
            password:  { type: "text" } 
        }
    });
}

