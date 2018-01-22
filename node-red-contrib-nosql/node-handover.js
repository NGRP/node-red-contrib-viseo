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

    RED.httpAdmin.get('/nosql/handover/', function(req, res) {
        res.json(databaseRegistry.list);
    });

    RED.nodes.registerType("handover", register);
}

const input = (node, data, config) => {
    try {
        if (config.operation === "get") get(node, data, config);
        else set(node, data, config);
    } catch (ex) { 
        node.log(ex.message) 
    }
}

const get = function(node, data, config) {

    let dbKey = (config.keyType === "str") ? config.key : helper.getByString(data, config.key, config.key);

    if (!dbKey) {
        node.warn('No id Found. Do nothing');
        return node.send(data);
    }

    node.server.databaseManager.find({ id: dbKey }, data, {}, function(err, data, results) {
        if (err) return node.error(err);
        if (results) {
            let result = results[0];
            if (result && result._handover !== undefined) {
                console.log('here ' + config.value)
                if (config.value !== "two") {
                     helper.setByString(data, "payload", result.handover);
                     return node.send(data);
                }
                else return (result._handover === true) ? node.send([data, undefined]) : node.send([undefined, data]);
            }
        }
        return node.send(data);
    });
};


const set = (node, data, config) => {

    let dbKey = (config.keyType === "str") ? config.key : helper.getByString(data, config.key, config.key);
    let value = (config.value === "disable") ? false : true;

    node.server.databaseManager.find({ id: dbKey }, data, {}, function(err, data, results) {
        if (err) return node.error(err);
        let newValue = {
            "id": dbKey,
        };

        if (results) {
            newValue = results[0];
        }

        newValue.mdate = Date.now();
        newValue._handover = value;

        node.server.databaseManager.update({ id: dbKey }, newValue, data, {}, function(err, data, result) {
            if (err) node.error(err);
            node.send(data);
        });
    });

};

