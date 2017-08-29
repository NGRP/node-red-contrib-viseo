'use strict';

const helper                = require('node-red-viseo-helper');
const extend                = require('extend');
const DbSelectorFactory     = require('./lib/database-selector.js');
const databaseRegistry      = require('node-red-contrib-viseo-nosql-manager').dbRegistry;
const DatabaseManager       = require('node-red-contrib-viseo-nosql-manager').DbManager;


// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        node.status({});    


        //select the config node depending on config
        let selectorFactory = new DbSelectorFactory();
        let selector = selectorFactory.create(config, databaseRegistry.values);
        if(!selector) {
            return node.status({ fill: "red", shape: "dot", text: "Database type '"+config["server-type"]+"' is not defined" });
        }

        this.server = RED.nodes.getNode(selector.config);

        //the config node can't be found in the flow
        if(!this.server) {
            return node.status({ fill: "red", shape: "dot", text: "Database configuration missing" });
        }

        //the config node is incomplete and doesn't define a database manager
        if(this.server.databaseManager === undefined || this.server.databaseManager instanceof DatabaseManager === false) {
            node.error("Database Manager for "+config.type+" must be set.");
        }


        //Some information is missing in the node
        let err = this.server.databaseManager.getStatus(config);
        if(err) {
            node.status({ fill: "red", shape: "dot", text: err });
        }


        this.on('input', (data)  => { input(node, data, config) });

    };

    RED.httpAdmin.get('/nosql/manager/', function(req, res) {
        res.json(databaseRegistry.list);
    });

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

            if(result) {
                if (config.merge) {
                    let value = helper.getByString(data, config.value);
                    if (value && (typeof value) === 'object') {
                        extend(true, value, result);
                        return node.send(data);
                    }
                }            

                helper.setByString(data, config.value, result);
            }
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

const set = (node, data, config) => {

    let dbKey = helper.getByString(data, config.key);
    let value = helper.getByString(data, config.value);
    
    if (!value) {
        return node.error('No values: '+ config.value);
    }
    
    value.id = dbKey;
    value.mdate = Date.now();

    node.server.databaseManager.update({ id: dbKey }, value, data, config, function(err, data, result) {
        if(err) {
            node.error(err);
        }
        node.send(data);
    });

};

const update = function(node, data, config) {

    let value = helper.getByString(data, config.value);
    let dbKey = config.key;
    
    if (dbKey.indexOf('{') !== 0) {
        dbKey = helper.getByString(data, config.key);
    }
    
    if (!value) {
        node.warn('No values: '+ config.value);
        node.send(data);
        return;
    }

    node.server.databaseManager.update(dbKey, value, data, config, function(err, data, result) {
        
        if(err) {
            node.error(err);
        }

        node.send(data);

    })
}

const add = (node, data, config) => {

    let values = helper.getByString(data, config.value);
    //check value
    if(Array.isArray(values) && typeof values[0] === "object" && values !== null) {
        node.server.databaseManager.add(values, data, config, function(err, data, results) {
            if(err) {
                node.error(err);
            }
            node.send(data);
        });
       
    } else {
        node.warn("Could not insert value. Operation ignored");
        node.send(data);
    }
}

const remove = (node, data, config) => {
    
    let dbKey = config.key;
    if (dbKey.indexOf('{') !== 0) {
        dbKey = helper.getByString(data, config.key || 'payload');
    }

    node.server.databaseManager.remove(dbKey, data, config, function(err, data, result) {
        if(err) {
            node.error(err);
        }
        node.send(data);
    });

}
