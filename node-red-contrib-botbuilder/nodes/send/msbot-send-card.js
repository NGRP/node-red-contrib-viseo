
const path     = require('path');
const builder  = require('botbuilder');
const mustache = require('mustache');
const event    = require('../../lib/event.js');
const msbot    = require('../../lib/msbot.js');
const i18n     = require('../../lib/i18n.js');
const helper   = require('node-red-viseo-helper');

const TYPING_DELAY_CONSTANT = 2000;

const marshall = (locale, str, data, def) => {
    if (!str) return def;
    str = i18n.translate(locale, str);
    str = mustache.render(str, data);
    str = helper.resolve(str, data, def);
    return str;
}

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("send-card", register, {});
}

const input = (node, data, config) => {
    let outMsg  = undefined;
    let locale  = 'fr_FR';
    
    if (data.user && data.user.profile){
        locale  = data.user.profile.locale;
    }

    if (!data.context)
         data.context = {}; // FIXME: Should be set in a global variable

    // Go for prompt
    if (config.prompt){
        msbot.promptNext(data.message, (prompt) => {
            data.prompt = prompt
            node.send(data); // Forward data
        }) 
    }

    // Send text message (see msbot.getMessage() documentation)
    if (config.sendType === 'text'){
        let text = config.text;
        if (config.random){
            let txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }
        outMsg = msbot.getMessage({type: config.sendType, "text": marshall(locale, text, data, '')});
    }

    // Send media message (see msbot.getMessage() documentation)
    else if (config.sendType === 'media'){
        outMsg = msbot.getMessage({type: config.sendType, "media": marshall(locale, config.media, data, '')});
    }

    // Send card message (see msbot.getMessage() documentation)
    else {
        outMsg = msbot.getMessage({
            type: config.sendType,
            quicktext : marshall(locale, config.quicktext, data, ''),
            "title"   : marshall(locale, config.title,     data, ''),
            "subtitle": marshall(locale, config.subtitle,  data, ''),
            "subtext" : marshall(locale, config.subtext,   data, ''),
            "attach"  : marshall(locale, config.attach,    data, ''),
            "buttons" : getButtons(locale, config, data)
        }, data);
        
        if (config.carousel){
            let carousel = data.context.carousel = data.context.carousel || [];
            carousel.push(outMsg.data.attachments[0]);

            // Forward data without sending anything
            return node.send(data);
            
        } else {
            let carousel = data.context.carousel = data.context.carousel || [];
            if (carousel.length > 0){
                carousel.push(outMsg.data.attachments[0])
                outMsg.attachmentLayout(builder.AttachmentLayout.carousel);
                outMsg.data.attachments = carousel;
                data.context.carousel = []; // clean
            }
        }
    }

    let reply = () => {
        // Event
        event.emit('reply', {'to': data.user.address, 'outMsg': outMsg, 'data': data }, node, config);

        // Reply
        let to = data.user.address;
        msbot.replyTo(to, outMsg, (err) => {
            if (err){ node.warn(err); }
            data.reply = outMsg; // for next nodes
            event.emit('replied', data, node, config);
            if (!config.prompt){ node.send(data); }
        });
    }

    // Send Message
    if (data.context.session){
        msbot.typing(data.context.session, () => {
            let delay = TYPING_DELAY_CONSTANT;
            delay += config.delay !== undefined ? parseInt(config.delay) : 0
            setTimeout(reply, delay)
        });
    } else { reply() }
}

const getButtons = (locale, config, data) => {
    if (data.buttons) return data.buttons
    
    let buttons = undefined
    if (config.sendType === 'quick'){
        buttons = config.quickreplies;
    } else if (config.sendType === 'card'){
        buttons = config.buttons;
    }

    if (!buttons || buttons.length <= 0) return;
    for (let button of buttons){
        if (!button.title || !button.action || !button.value) continue;
        button.title  = marshall(locale, button.title,  data, '')
        button.action = marshall(locale, button.action, data, '')
        button.value  = marshall(locale, button.value,  data, '')
    }
    return buttons;
}