'use strict';

const helper        = require('node-red-viseo-helper');

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

        if(config["server-mongo"] !== undefined) {
            this.server = RED.nodes.getNode(config["server-mongo"]);
        }

        node.status({});

        if(this.server) {

            if(this.server.databaseManager === undefined) {
                error("Database Manager for "+config.type+" must be set.");
            }

            let err = this.server.databaseManager.getStatus(config);
            if(err) {
                node.status({ fill: "red", shape: "dot", text: err });
            }

            this.on('close', (done) => {
                this.server.databaseManager.end(done);
            });
           
        } else {
            return node.status({ fill: "red", shape: "dot", text: "Database configuration missing" });
        }

        this.on('input', (data)  => { input(node, data, config)  });

    }

    RED.nodes.registerType("nosql", register);
}

const input = (node, data, config) => {
    try {

        switch(config.operation) {
            case 'set':
                set(node, data, config);
                break;
            case 'get':
                get(node, data, config);
                break;
            case 'find':
                find(node, data, config);
                break;
            case 'update':
                update(node, data, config);
                break;
            case 'add':
                add(node, data, config);
                break;
            case 'delete':
                remove(node, data, config);
        }

    } catch (ex) { 
        node.log(ex.message) 
    }
}

const get = function(node, data, config) {
    let dbKey = helper.getByString(data, config.key, config.key);
    if (!dbKey) {
        node.warn('No id Found. Do nothing');
        return node.send(data);
    }
    node.server.databaseManager.find({ id: dbKey }, data, config, function(err, data, results) {
        if (err) {
            return node.error(err);
        }
        if(results) {
            let result = results[0];
            if (config.merge) {
                let value = helper.getByString(data, config.value);
                if (value && (typeof value) === 'object') {
                    extend(true, value, result);
                    node.send(data);
                }
            }
            helper.setByString(data, config.value, result);
        }

        
        node.send(data);
    });
};

const find = function(node, data, config) {

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
    node.server.databaseManager.find(dbKey, data, config, function(err, data, results) { 
        if (err) {
            return node.error(err);
        }
        helper.setByString(data, config.value || 'payload', results);
        node.send(data);
    });
};
