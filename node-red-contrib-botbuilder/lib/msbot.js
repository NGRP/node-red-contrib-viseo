"use strict";

const fs = require("fs");
const builder = require('botbuilder');

// ------------------------------------------
//  VALIDATORS
// ------------------------------------------

const ACTIONS_TYPES = [
    'postBack',
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
    "gif": "image/gif"
}

const absURL = (url) => {
    if (undefined === url) return url;
    if (url.startsWith('http')) return url;
    return CONFIG.server.host + ":" + CONFIG.server.port + url;
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
    for (let opts of cards) {
        let card = getHeroCard(opts)
        msg.addAttachment(card);
    }
    return msg;
};

const buildQuickReplyObject = (obj) => {
    return {
        content_type: 'text',
        title: obj.title,
        payload: obj.value
    };
};

const buildRawMessage = (msg, opts) => {
    if (opts.type === 'card') {
        return false;
    }

    if (opts.type === 'text') {
        msg.text(opts.text);
        return true;
    }

    if (opts.type === 'media') {
        let url = absURL(opts.media);
        msg.attachments([{
            "contentType": CONTENT_TYPE[url.substring(url.length - 3)],
            "contentUrl": url
        }]);
        return true;
    }

    // Work In Progress: Facebook Quick Buttons: Should be exported to a facebook.js hook 
    if (opts.type === 'quick') {
        msg.text(opts.quicktext);
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
        let url = absURL(opts.attach);
        msg.attachments([{
            "contentType": CONTENT_TYPE[url.substring(url.length - 3)],
            "contentUrl": url
        }]);
        return true;
    }

    return false;
}

const getHeroCard = (opts) => {
    let card = new builder.HeroCard();

    // Attach Images to card
    if (!!opts.attach) {
        let url = absURL(opts.attach);
        card.images([builder.CardImage.create(undefined, url)])
    }

    // Attach Subtext, appears just below subtitle, differs from Subtitle in font styling only.
    if (!!opts.subtext) {
        card.text(opts.subtext);
    }

    // Attach Subtitle, appears just below Title field, differs from Title in font styling only.
    if (!!opts.subtitle) {
        card.subtitle(opts.subtitle);
    }

    // Attach Title to card
    if (!!opts.title) {
        card.title(opts.title);
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
const promptNext = (inMsg, callback) => {
    let convId = inMsg.address.conversation.id;
    PROMPT_CALLBACK[convId] = callback;
}

const hasPrompt = (inMsg) => {
    let convId = inMsg.address.conversation.id;

    let cb = PROMPT_CALLBACK[convId];
    if (undefined === cb) return false;

    delete PROMPT_CALLBACK[convId];
    cb(inMsg);
    return true;
}

// ------------------------------------------
//   TYPING
// ------------------------------------------

const typing = (session, callback) => {
    if (undefined === session) return;
    session.sendTyping();
    callback();
}

// ------------------------------------------
//   REPLY
// ------------------------------------------

const replyTo = (bot, inMsg, outMsg, next) => {
    if (undefined === inMsg) return;
    if (undefined === outMsg) return;

    // Set the message address
    outMsg.address(inMsg.address);

    // Send the message
    try {
        bot.send(outMsg, next);
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
