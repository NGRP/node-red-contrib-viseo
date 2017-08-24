"use strict";

const fs      = require('fs');
const path    = require('path');
const builder = require('botbuilder');
const logger  = require('../../lib/logger.js');
const event   = require('../../lib/event.js');
const helper  = require('../../lib/helper.js');

// Retrive requirements
require('../../lib/i18n.js').init();

// Retrieve server
const msbot    = require('../../lib/msbot.js');
const server   = require('../../lib/server.js');

// ------------------------------------------
// SERVER
// ------------------------------------------

const startServer = (node, config, RED) => {

    server.start((err, bot) => {
        
        if (err){
            let msg = "disconnected (" + err.message + ")";
            node.status({fill:"red", shape:"ring", text: msg});
            return;
        }
        node.status({fill:"green", shape:"dot", text:"connected"});

        // Root Dialog
        msbot.bindDialogs(bot, (err, data, type) => {
            event.emit(type, data, node, config);
            if (type === 'received') {
                return node.send(data)
            }
        });

    }, config, RED);
}

// Stop server
const stopServer = (done) => {
    if (undefined !== server){  server.stop(); }
    done();
}

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    logger.init(RED);

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        if(config.port) {
            config.port = parseInt(config.port);
        }  else {
            config.port = undefined;
        }

        config.appId = node.credentials.appId;
        config.appPassword = node.credentials.appPassword;

        startServer(node, config, RED);
        this.on('close', (done) => { stopServer(done) });
    }
    RED.nodes.registerType("bot", register, { credentials : {
        appId:         { type : "text" },
        appPassword:   { type : "text" }
    }});
}