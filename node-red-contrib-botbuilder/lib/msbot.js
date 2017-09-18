"use strict";

const fs      = require("fs");
const builder = require('botbuilder');
const helper  = require('node-red-viseo-helper');

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

const getUserAddress = exports.getUserAddress = (data) => {
    return helper.getByString(data, 'user.address', undefined)
}

const getConvId = exports.getConvId = (data) => {
    return helper.getByString(data, 'user.address.conversation.id', undefined)
}

const getContext = exports.getContext = (data) => {
    if (!data.context) data.context = {};
    return data.context;
}

const getSession = exports.getSession = (data) => {
    let context = getContext(data)
    return context.session
}

const getUserProfile = exports.getUserProfile = (data) => {
    if (!data.user) data.user = {};
    if (!data.user.profile) data.user.profile = {};
    return data.user.profile;
}

const getLocale = exports.getLocale = (data) => {
    let profile = getUserProfile(data);
    return profile.locale || 'fr_FR';
}

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
        let data = helper.buildMessageFlow({ context, message, 'payload': message.text }, {})

        // Clear timeouts
        let convId  = getConvId(data)
        clearHandles(convId);
    
        // Handle Prompt
        if (helper.hasDelayedCallback(convId, data.message)) return;

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

// ------------------------------------------
//  MESSAGES
// ------------------------------------------

/**
 * Multi purpose function can be called
 * - with ONLY a 'text' attribute to create a text (raw) message
 * - with ONLY an 'image' attribute to create an image (raw) message 
 * - with ONLY card's attribute to create a Card message
 */
const getMessage = exports.getMessage = (cards, options) => {

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
