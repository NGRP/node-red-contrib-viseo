"use strict";

const fs      = require('fs');
const path    = require('path');
const builder = require('botbuilder');
const logger  = require('../../lib/logger.js');

// Retrive requirements
require('../../lib/helper.js');
require('../../lib/config.js').init();

// Retrieve server
const MSBot    = require('../../lib/msbot.js');
const server   = require('../../lib/server.js');

// ------------------------------------------
// CLASS: Context
// ------------------------------------------

let CONTEXT = {};
class Context {
    constructor(timestamp) {
        this.timestamp = timestamp || Date.now();
        // TODO: Clean the Map according to a ttl
    }

    get(key, def) {
        let ctx = CONTEXT[this.timestamp];
        if (!ctx) ctx = CONTEXT[this.timestamp] = {};
        
        let val = ctx[key];
        if (val) return val

        if (def) this.set(key, def);
        return def; 
    }

    set(key, value) {
        let ctx = CONTEXT[this.timestamp];
        if (!ctx) ctx = CONTEXT[this.timestamp] = {};
        ctx[key] = value;
        return this;
    }
}

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

        // CleanUp context
        CONTEXT = {}
        
        // Greetings
        bot.on('contactRelationUpdate', (message) => { 
            if (message.action !== 'add') { /* delete user data */ return; }
            
            // Add User to data stream
            // (not in context because some node may access to user properties)
            // MUST be overrided by storage nodes 
            var usr = {"id": message.user.id, profile: {}}

            // Add context obejct to store the lifetime of the stream
            var context = new Context();
            context.set('bot', bot);

            // Send message
            node.send([{ "context": context, "message": message, "user": usr , "fmsg": config.fmsg}, undefined]) 
         });

        // Root Dialog
        bot.dialog('/', [(session) => { 
            let message = session.message;
            if (MSBot.hasPrompt(message)) return;

            // Add User to data stream
            // (not in context because some node may access to user properties)
            // MUST be overrided by storage nodes 
            var usr = {"id": message.user.id, profile: {}}

            // Add context obejct to store the lifetime of the stream
            var context = new Context();
            context.set('bot', bot).set('session', session);

            // Send message
            node.send([undefined, { "context": context, "message": message, "payload": message.text, "user": usr, "fmsg": config.fmsg }])
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