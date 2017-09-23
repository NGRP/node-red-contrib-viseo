"use strict";

const fs      = require("fs");
const builder = require('botbuilder');
const helper  = require('node-red-viseo-helper');
const botmgr  = require('node-red-viseo-bot-manager');

// ------------------------------------------
//  SERVER
// ------------------------------------------

let BOT_CONTEXT = {};

const bindDialogs = exports.bindDialogs = (bot, callback) => {

    // CleanUp context
    BOT_CONTEXT = {}

    // Greetings
    bot.on('contactRelationUpdate', (message) => { 
        if (message.action !== 'add') { /* delete user data */ return; }
        
        // Add context object to store the lifetime of the stream
        let context = BOT_CONTEXT[Date.now()] = {};
        context.bot = bot;

        // Build data
        let data = helper.buildMessageFlow({ context, message, 'payload': message.text }, {})

        callback(undefined, data, 'greeting');
    });

    // Root Dialog
    bot.dialog('/', [(session) => { 

        // Add context object to store the lifetime of the stream
        let context = BOT_CONTEXT[Date.now()] = {};
        context.bot     = bot;
        context.session = session;

        // Build data
        let message = session.message;
        let data = botmgr.buildMessageFlow({ context, message, 'payload': message.text }, { agent: 'botbuilder' })

        // Clear timeouts
        let convId  = botmgr.getConvId(data)
        clearHandles(convId);
    
        // Handle Prompt
        if (botmgr.hasDelayedCallback(convId, data.message)) return;

        callback(undefined, data, 'received');
    }]);
}


// ------------------------------------------
//   TYPING
// ------------------------------------------

var TIMEOUT_HANDLES = {}
const saveTimeout = exports.saveTimeout = (convId, handle) => {
    if (!TIMEOUT_HANDLES[convId])
        TIMEOUT_HANDLES[convId] = [];
    TIMEOUT_HANDLES[convId].push(handle)
}

const clearHandles = exports.clearTimeout = (convId) => { 
    if (!TIMEOUT_HANDLES[convId]) return;
    for (let handle of TIMEOUT_HANDLES[convId]){
        clearTimeout(handle);
    }
    TIMEOUT_HANDLES[convId] = []
}

const typing = exports.typing = (session, callback) => {
    if (undefined === session) return;
    session.sendTyping();
    callback();
}

