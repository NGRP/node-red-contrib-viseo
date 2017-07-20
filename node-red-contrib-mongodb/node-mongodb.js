'use strict';

const MongoDBManager = require('./lib/mongodb-manager.js');
const dbRegistry = require('node-red-contrib-viseo-nosql-manager').dbRegistry;


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
        this.ssl = config.ssl;
        this.databaseManager = new MongoDBManager(this);

        //remember to close connections on node-red stop
        this.on('close', (done) => {
            this.databaseManager.end(done);
        });
           
    }

    RED.nodes.registerType("mongodb", register, {
        credentials: {
            host:      { type: "text" },
            port:      { type: "text" },
            user:      { type: "text" },
            password:  { type: "text" } 
        }
    });

    dbRegistry.register(MongoDBManager);


}

