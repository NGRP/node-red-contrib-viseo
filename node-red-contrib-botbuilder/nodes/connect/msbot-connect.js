"use strict";

const fs      = require('fs');
const path    = require('path');
const builder = require('botbuilder');
const logger  = require('../../lib/logger.js');
const event   = require('../../lib/event.js');
const helper  = require('../../lib/helper.js');

// Retrive requirements
require('../../lib/config.js').init();
require('../../lib/i18n.js').init();

// Retrieve server
const msbot    = require('../../lib/msbot.js');
const server   = require('../../lib/server.js');

// ------------------------------------------
// SERVER
// ------------------------------------------

let BOT_CONTEXT = {};
const startServer = (node, config, RED) => {

    server.start((err, bot) => {
        
        if (err){
            let msg = "disconnected (" + err.message + ")";
            node.status({fill:"red", shape:"ring", text: msg});
            return;
        }
        node.status({fill:"green", shape:"dot", text:"connected"});

        // CleanUp context
        BOT_CONTEXT = {}

        // Greetings
        bot.on('contactRelationUpdate', (message) => { 
            if (message.action !== 'add') { /* delete user data */ return; }
            
            // Add User to data stream
            // (not in context because some node may access to user properties)
            // MUST be overrided by storage nodes 
            var usr = {"id": message.user.id, profile: {}}

            // Add context obejct to store the lifetime of the stream
            var context = BOT_CONTEXT[Date.now()] = {};
            context.bot = bot;

            // Send 
            let data = { "context": context, "message": message, "user": usr, "fmsg": config.fmsg}
            event.emit('greeting', data, node, config);
            node.send([data, undefined])
         });

        // Root Dialog
        bot.dialog('/', [(session) => { 
            let message = session.message
            let convId  = message.address.conversation.id
            if (msbot.hasPrompt(convId, message)) return;

            // Add User to data stream
            // (not in context because some node may access to user properties)
            // MUST be overrided by storage nodes 
            let usr = {"id": message.user.id, address: message.address, profile: {}}

            // Add context obejct to store the lifetime of the stream
            var context = BOT_CONTEXT[Date.now()] = {};
            context.bot     = bot;
            context.session = session;

            // Send message
            let data = { "context": context, "message": message, "payload": message.text, "user": usr, "fmsg": config.fmsg }
            event.emit('received', data, node, config);
            node.send([undefined, data])
        }]);

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
        config.port = parseInt(config.port);
	    config.fmsg = ("undefined" == config.fmsg) ? "markdown" : config.fmsg;
        startServer(node, config, RED);
        this.on('close', (done) => { stopServer(done) });
    }
    RED.nodes.registerType("bot", register, {});
}