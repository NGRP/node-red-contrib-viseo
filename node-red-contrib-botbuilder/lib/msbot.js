"use strict";

const fs = require("fs");
const builder = require('botbuilder');

// ------------------------------------------
//  VALIDATORS
// ------------------------------------------

const ACTIONS_TYPES = [
    'postBack',
    'askLocation',
    'imBack',
    'openUrl',
    'showImage',
    'playAudio',
    'playVideo',
    'call'
];

// ------------------------------------------
//  HELPERS
// ------------------------------------------

const CONTENT_TYPE = {
    "jpg": "image/jpg",
    "gif": "image/gif",
    "png": "image/png",
}

const absURL = (url) => {
    if (undefined === url) return url;
    if (url.startsWith('http')) return url;

    if(CONFIG.server === undefined || CONFIG.server.host === undefined) {
        console.log("To use relative url, please assign server.host in your configuration file");
        return url;
    }
    return CONFIG.server.host + url;
}

// ------------------------------------------
//  MESSAGES
// ------------------------------------------

let BOT_CONTEXT = {};

const bindDialogs = exports.bindDialogs = (bot, callback) => {

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
        let data = { "context": context, "message": message, "user": usr }
        callback(undefined, data, 'greeting');
    });

    // Root Dialog
    bot.dialog('/', [(session) => { 

        let message = session.message;
        let convId  = message.address.conversation.id

        // Clear all delayed messages
        clearHandles(convId);

        // Handle Prompts
        if (hasPrompt(convId, message)) return;

        // Add User to data stream
        // (not in context because some node may access to user properties)
        // MUST be overrided by storage nodes 
        let usr = {"id": message.user.id, address: message.address, profile: {}}

        // Add context obejct to store the lifetime of the stream
        let context = BOT_CONTEXT[Date.now()] = {};
        context.bot     = bot;
        context.session = session;

        // Send message
        let data = { "context": context, "message": message, "payload": message.text, "user": usr }
        callback(undefined, data, 'received');

    }]);
}

// ------------------------------------------
//  MESSAGES
// ------------------------------------------

/**
 * Multi purpose function can be called
 * - with ONLY a 'text' attribute to create a text (raw) message
 * - with ONLY an 'image' attribute to create an image (raw) message 
 * - with ONLY card's attribute to create a Card message
 */
const getMessage = (cards, options) => {

    // Object means already decoded
    if ('object' === typeof cards) {
        cards = [cards];
    }

    let msg = new builder.Message();

    // set the format
    if (options && options.fmsg) msg.textFormat(options.fmsg);

    // Is Carousel
    if (cards.length > 1) {
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
    }

    // Is RAW message
    else if (buildRawMessage(msg, cards[0])) {
        return msg;
    }

    // Message with HERO 
    let _speech = '';
    for (let opts of cards) {
        let card = getHeroCard(opts)
        msg.addAttachment(card);

        if (msg.speak && opts.speech) {
            msg.speak(opts.speech === true ? opts._speech : opts.speech);
        }
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
        let url  = absURL(opts.media);
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
        let url  = absURL(opts.attach);
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
        let url = absURL(opts.attach);
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

// ------------------------------------------
//   PROMPTS
// ------------------------------------------

var PROMPT_CALLBACK = {}
const promptNext = (convId, callback) => {
    if (!convId) return;
    PROMPT_CALLBACK[convId] = callback;
}

const hasPrompt = (convId, data) => {
    if (!convId) return;

    let cb = PROMPT_CALLBACK[convId];
    if (undefined === cb) return false;

    delete PROMPT_CALLBACK[convId];
    cb(data);
    return true;
}

// ------------------------------------------
//   TYPING
// ------------------------------------------

var TIMEOUT_HANDLES = {}
const saveTimeout = (convId, handle) => { console.log('saveTimeout', convId)
    if (!TIMEOUT_HANDLES[convId])
        TIMEOUT_HANDLES[convId] = [];
    TIMEOUT_HANDLES[convId].push(handle)
}
const clearHandles = (convId) => { console.log('clearHandles', convId)
    if (!TIMEOUT_HANDLES[convId]) return;
    for (let handle of TIMEOUT_HANDLES[convId]){
        clearTimeout(handle);
    }
    TIMEOUT_HANDLES[convId] = []
}
const typing = (session, callback) => {
    if (undefined === session) return;
    session.sendTyping();
    callback();
}

// ------------------------------------------
//   REPLY
// ------------------------------------------

const replyTo = (address, outMsg, next) => {
    if (undefined === address) return;
    if (undefined === outMsg) return;

    // Set the message address
    outMsg.address(address);

    // Send the message
    try {
        global.botbuilder.send(outMsg, next);
    } catch (ex) { error(ex); next(); }
}

// ------------------------------------------
//   EXPORTS
// ------------------------------------------

exports.promptNext = promptNext;
exports.hasPrompt = hasPrompt;
exports.getMessage = getMessage;
exports.replyTo = replyTo;
exports.typing = typing;
exports.saveTimeout = saveTimeout;
exports.clearTimeout = clearHandles;