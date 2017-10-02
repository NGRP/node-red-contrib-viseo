"use strict";

const fs      = require('fs');
const path    = require('path');
const builder = require('botbuilder');
const logger  = require('../../lib/logger.js');
const helper  = require('node-red-viseo-helper');
const botmgr  = require('node-red-viseo-bot-manager');

// Retrieve server
const msbot    = require('../../lib/msbot.js');
const server   = require('../../lib/server.js');


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
    
    // Assume we send the message to the current user address
    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== 'botbuilder') return false;

    // Building the message
    let message = getMessage(data.reply);
    if (!message) return false;

    message.address(address);

    // Send the message
    let doReply = () => {
        try {
            bot.send(message, (err) => {
                if (err){ return node.warn(err); }
                // <continue> and consume the event
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
    let convId  = botmgr.getConvId(data)
    let session = getSession(data)
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

// ------------------------------------------
//  HELPERS
// ------------------------------------------

const CONTENT_TYPE = {
    "jpg": "image/jpg",
    "gif": "image/gif",
    "png": "image/png",
}

const getSession  = (data) => {
    let context = botmgr.getContext(data)
    return context.session
}

// ------------------------------------------
//  MESSAGES
// ------------------------------------------

const getMessage = (replies) => {
    
    let msg = new builder.Message();

    // The message will be a carousel
    if (replies.length > 1) {
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
    }

    // Is RAW message
    else if (buildRawMessage(msg, replies[0])) {
        // Botbuilder Message (Cortana) should set that for prompt
        if (replies[0].prompt && msg.inputHint){ msg.inputHint('expectingInput'); }
        return msg;
    }

    // One or multiple cards
    for (let reply of replies) {
        let card = getHeroCard(reply)
        msg.addAttachment(card);

        // Only the latest speech is used
        if (msg.speak && reply.speech) {
            msg.speak(reply.speech === true ? (card._speech || '') : reply.speech);
        }

        // Botbuilder Message (Cortana) should set that for prompt
        if (reply.prompt && msg.inputHint){ msg.inputHint('expectingInput'); }
    }
    return msg;
};
    
    const buildQuickReplyObject = (obj) => {
    
        return {
            content_type: obj.action === 'askLocation' ? 'location' : 'text',
            title: obj.title,
            payload: obj.value
        };
    };
    
const buildRawMessage = (msg, opts) => {
    if (opts.type === 'card') {
        return false;
    }

    if (opts.type === 'signin') {
        var card = new builder.SigninCard()
        card.text(opts.text);
        
        if (msg.speak && opts.speech) { // Set speech value
            msg.speak(opts.speech === true ? opts.text : opts.speech);
        }

        card.button(opts.title, opts.url)
        msg.addAttachment(card);
        return true;
    }

    if (opts.type === 'text') {
        msg.text(opts.text);
        if (msg.speak && opts.speech) { // Set speech value
            msg.speak(opts.speech === true ? opts.text : opts.speech);
        }
        return true;
    }

    if (opts.type === 'media') {
        let url  = helper.absURL(opts.media);
        let type = CONTENT_TYPE[url.substring(url.length - 3)]
        msg.attachments([{
            "contentType": type || CONTENT_TYPE['png'],
            "contentUrl": url
        }]);
        return true;
    }

    // Work In Progress: Facebook Quick Buttons: Should be exported to a facebook.js hook 
    if (opts.type === 'quick') {
        msg.text(opts.quicktext);
        if (msg.speak && opts.speech) { // Set speech value
            msg.speak(opts.speech === true ? opts.text : opts.speech);
        }
        msg.data.address = { channelId: 'facebook' };
        const quickRepliesObject = {
            facebook: { quick_replies: [] }
        };

        for (let button of opts.buttons){
            quickRepliesObject.facebook.quick_replies.push(buildQuickReplyObject(button));
        }
        msg.sourceEvent(quickRepliesObject);
        return true;
    }

    // Backward compatibility
    if (!!opts.attach && undefined === opts.buttons) {
        let url  = helper.absURL(opts.attach);
        let type = CONTENT_TYPE[url.substring(url.length - 3)]
        msg.attachments([{
            "contentType": type || CONTENT_TYPE['png'],
            "contentUrl": url
        }]);
        return true;
    }

    return false;
}

const getHeroCard = (opts) => {
    let card     = new builder.HeroCard();
    opts._speech = '';

    // Attach Images to card
    if (!!opts.attach) {
        let url = helper.absURL(opts.attach);
        card.images([builder.CardImage.create(undefined, url)])
    }

    // Attach Title to card
    if (!!opts.title) {
        opts._speech += opts.title + ' ';
        card.title(opts.title);
    }

    // Attach Subtext, appears just below subtitle, differs from Subtitle in font styling only.
    if (!!opts.subtext) {
        opts._speech += opts.subtext
        card.text(opts.subtext);
    }

    // Attach Subtitle, appears just below Title field, differs from Title in font styling only.
    if (!!opts.subtitle) {
        opts._speech += opts.subtitle
        card.subtitle(opts.subtitle);
    }

    // Attach Buttons to card
    let buttons = opts.buttons;
    if (undefined !== buttons) {
        var btns = [];
        for (let button of buttons) {
            if ("string" === typeof button) {
                btns.push(builder.CardAction.postBack(undefined, button, button))
            } else {
                btns.push(builder.CardAction[button.action](undefined, button.value, button.title));
            }
        }
        card.buttons(btns);
    }

    return card;
}
