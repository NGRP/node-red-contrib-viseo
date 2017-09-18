"use strict";

const fs      = require('fs');
const path    = require('path');
const builder = require('botbuilder');
const logger  = require('../../lib/logger.js');
const helper  = require('node-red-viseo-helper');

// Retrive requirements
require('../../lib/i18n.js').init();

// Retrieve server
const msbot    = require('../../lib/msbot.js');
const server   = require('../../lib/server.js');

// ------------------------------------------
// SERVER
// ------------------------------------------

let REPLY_HANDLER = {};
const start = (node, config, RED) => {
    server.start((err, bot) => {
        
        if (err){
            let msg = "disconnected (" + err.message + ")";
            return node.status({fill:"red", shape:"ring", text: msg});
        }
        node.status({fill:"green", shape:"dot", text:"connected"});

        // Root Dialog
        msbot.bindDialogs(bot, (err, data, type) => {
            helper.emitEvent(type, node, data, config);
            if (type === 'received') { return node.send(data) }
        });

        // Handle all reply
        REPLY_HANDLER[node.id] = (node, data, config) => {
            try { reply(bot, node, data, config) } catch (ex){ console.log(ex); }
        };
        helper.listenEvent('reply', REPLY_HANDLER[node.id])

    }, config, RED);
}

// Stop server
const stop = (node, config, done) => {
    helper.removeListener('reply', REPLY_HANDLER[node.id])
    server.stop();
    done();
}

// --------------------------------------------------------------------------
//  REPLY
// --------------------------------------------------------------------------

const reply = (bot, node, data, config) => { 
    if (data.message.agent !== 'botbuilder') return;

    let message = data.reply;
    if (!message) return;

    let address = msbot.getUserAddress(data); 
    if (!address) return;

    // Set the message address
    message.address(address);

    // Send the message
    let doReply = () => {
        try { 
            bot.send(message, (err) => {
                if (err){ return node.warn(err); }
                helper.fireAsyncCallback(data);
            }) 
        } catch (ex) { node.warn(ex); }
    }

    // Handle the delay
    let delay  = config.delay !== undefined ? parseInt(config.delay) : 0 
    delayReply(delay, data, doReply)
}

const TYPING_DELAY_CONSTANT = 2000;
const delayReply = (delay, data, callback) => {
    let convId  = msbot.getConvId(data)
    let session = msbot.getSession(data)
    if (session){
        msbot.typing(session, () => {
            let handle = setTimeout(callback, delay + TYPING_DELAY_CONSTANT)
            msbot.saveTimeout(convId, handle);
        });
    } else if (delay > 0) { 
        let handle = setTimeout(callback, delay) 
        msbot.saveTimeout(convId, handle);
    } else {
        callback();
    }
}

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    logger.init(RED);

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        if (config.port) {
            config.port = parseInt(config.port);
        }

        config.appId = node.credentials.appId;
        config.appPassword = node.credentials.appPassword;

        start(node, config, RED);
        this.on('close', (done) => { stop(node, config, done) });
    }
    RED.nodes.registerType("bot", register, { credentials : {
        appId:         { type : "text" },
        appPassword:   { type : "text" }
    }});
}