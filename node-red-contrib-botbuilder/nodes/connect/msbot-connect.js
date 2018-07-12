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

    //check it's the last message
    let timestamp = data.message.timestamp

    let context = botmgr.getContext(data);
    
    if(timestamp && context.lastMessageDate !== timestamp) {
        return false;
    }
    
    // Assume we send the message to the current user address
    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== 'botbuilder') return false;

    // Building the message
    let message = getMessage(node, address, data.reply, timestamp == undefined);
    if (!message) return false;

    message.address(address);

    let customTyping = (callback) => {
        try {

            let typing = new builder.Message();
            typing.data.type = "typing";
            typing.address(address);
            bot.send(typing, (err) => {
                if (err){ return node.warn(err); }
                // <continue> and consume the event
                callback();
            })
        } catch (ex) { node.warn(ex); }
    }

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
    delayReply(delay, data, doReply, customTyping)
}

const TYPING_DELAY_CONSTANT = 2000;
const delayReply = (delay, data, callback, customTyping) => {
    let convId  = botmgr.getConvId(data)
    let session = getSession(data)
    if (session){
        msbot.typing(session, () => {
            let handle = setTimeout(callback, delay + TYPING_DELAY_CONSTANT)
            msbot.saveTimeout(convId, handle);
        });
    } else {
        customTyping(function() {
            let handle = setTimeout(callback, delay + TYPING_DELAY_CONSTANT) 
            msbot.saveTimeout(convId, handle);
        })
        
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

const getMessage = (node, address, replies, isPush) => {
    let msg = new builder.Message();

    // The message will be a carousel
    if (replies.length > 1) {
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
    }

    // Is RAW message
    else if (buildRawMessage(node, msg, replies[0], address, isPush)) {
        // Botbuilder Message (Cortana) should set that for prompt
        if (replies[0].prompt && msg.inputHint){ msg.inputHint('expectingInput'); }
        return msg;
    }

    // One or multiple cards
    for (let reply of replies) {
        
        let card = getHeroCard(reply);
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

const buildButtonMessage = (msg, address, reply, isPush) => {

}

    
const buildRawMessage = (node, msg, opts, address, isPush) => {

    var contentShare = false;
    for (let button of opts.buttons || []) if (button.action === "share") contentShare = true;


    if(address.channelId === 'facebook') {


        if (contentShare) {

            buildFacebookSpecificMessage(msg, "generic", opts, isPush);
            return true;

        }

        
        if (opts.type === 'card') {
            if(!opts.title && !opts.attach && opts.buttons && opts.subtitle) {

                buildFacebookSpecificMessage(msg, "button", opts, isPush);            
                return true;
            }
        }

    } else if($contentShare) {
        node.error("Share option only available on Facebook");
        return true;
    }


    if(isPush) {
        msg.sourceEvent({ facebook : {
            messaging_type: "MESSAGE_TAG",
            tag: "NON_PROMOTIONAL_SUBSCRIPTION"

        }});
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
        let fText = opts.text;
        if (address.channelId === 'facebook') {
            fText = fText.replace(/\n\n/g,'\n');
            fText = fText.replace(/\n/g,'\n\n');
        }
        msg.text(fText);
        if (msg.speak && opts.speech) { // Set speech value
            msg.speak(opts.speech === true ? fText : opts.speech);
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
        let fText = opts.quicktext;
        if (address.channelId === 'facebook') {
            fText = fText.replace(/\n\n/g,'\n');
            fText = fText.replace(/\n/g,'\n\n');
        }
        msg.text(fText);
        
        if (msg.speak && opts.speech) { // Set speech value
            msg.speak(opts.speech === true ? fText : opts.speech);
        }

        let isLocation = false;
        let newQuick = [];
        for (let button of opts.buttons) {
            let card = builder.CardAction.imBack(undefined, button.value, button.title);
            newQuick.push(card);
            if (button.action === "askLocation" ) isLocation = true;
        }

        if (isLocation) {
            msg.data.address = { channelId: 'facebook' };
            const quickRepliesObject = {
                facebook: { quick_replies: [] }
            };
            for (let button of opts.buttons) quickRepliesObject.facebook.quick_replies.push(buildQuickReplyObject(button));
            msg.sourceEvent(quickRepliesObject);
        }

        msg.suggestedActions( builder.SuggestedActions.create( undefined, newQuick ));
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

const buildFacebookSpecificMessage = (msg, template, reply, isPush) => {


    let buttons = [];
    for(let button of reply.buttons || []) {
        buttons.push(buildFacebookButtonObject(button));
    }

    msg.data.address = { channelId: 'facebook' };

    let attachment = {
        "type":"template",
        "payload":{
            "template_type": template

        }
    };

    let messaging_type = isPush ? "MESSAGE_TAG" : "RESPONSE";
    let tag = isPush ? "NON_PROMOTIONAL_SUBSCRIPTION" : undefined;

    switch(template) {

        case 'button':
            attachment.payload.text = reply.subtitle;
            attachment.payload.buttons = buttons;
            break;

        case 'generic':
            attachment.payload.elements = [
                {
                    "title":     reply.title,
                    "subtitle":  reply.subtitle,
                    "image_url": reply.attach ? helper.absURL(reply.attach) : '',
                    "buttons":   buttons
                }
            ];
            break;
    }

    // Only the latest speech is used
    let _speech = "";
    if (!reply.speech) {
        _speech =  reply.speech;
    } else {
        if (reply.title) _speech += reply.title + ' ';
        if (reply.subtext) _speech += reply.subtext ;
        if (reply.subtitle) _speech += reply.subtitle;
    }
    
    if (msg.speak && reply.speech) {
        msg.speak(_speech || '');
    }
    if (reply.prompt && msg.inputHint) {
        msg.inputHint('expectingInput');
    }

    msg.sourceEvent({ facebook: { attachment, messaging_type, tag }});
}

const buildFacebookButtonObject = (obj) => {
    if (obj.action === "share") return {
        "type": "element_share",
        "share_contents": { 
            "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [
                    {
                        "title":     obj.sharedCard.title,
                        "subtitle":  obj.sharedCard.text,
                        "image_url": obj.sharedCard.media,
                        "buttons": [
                        {
                            "type": "web_url",
                            "url":   helper.absURL(obj.sharedCard.url),
                            "title": obj.sharedCard.button
                        }]
                    }]
                }
            }
        }
    }
    if (obj.action === "openUrl") return {
        "type":"web_url",
        "url": obj.value,
        "title": obj.title,
        "messenger_extensions": "false",  
        //"fallback_url": "https://www.facebook.com/"
    }
    if (obj.action === "call") return {
        "type":"phone_number",
        "title":  obj.title,
        "payload": obj.value
    }
    else return {
        "type":"postback",
        "title": obj.title,
        "payload": obj.value
    }
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
