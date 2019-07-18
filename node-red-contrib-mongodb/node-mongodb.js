'use strict';

const MongoDBManager = require('./lib/mongodb-manager.js');
const dbRegistry = require('node-red-contrib-viseo-nosql-manager').dbRegistry;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);

        this.useConnectionString = config.useConnectionString;
        this.databaseManager = new MongoDBManager(RED, this);

        //remember to close connections on node-red stop
        let self = this;
        this.on('close', (done) => {
            self.databaseManager.end(done);
        });
           
    }

    RED.nodes.registerType("mongodb", register, {
        credentials: {
            hosts:      { type: "text" },
            user:      { type: "text" },
            password:  { type: "text" },
            database:  { type: "text" },
            replicaSet:{ type: "text" },
            ssl:       { type: "text" },
            connectionString : { type: "text" }
        }
    });

    dbRegistry.register(MongoDBManager);


}

