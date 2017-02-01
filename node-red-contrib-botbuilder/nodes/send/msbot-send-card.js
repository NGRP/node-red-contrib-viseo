
const path     = require('path');
const builder  = require('botbuilder');
const msbot    = require('../../lib/msbot.js');
const i18n     = require('../../lib/i18n.js');
const helper   = require('node-red-viseo-helper');

const TYPING_DELAY_CONSTANT = 2000;

const marshall = (locale, str, data, def) => {
    let resolved  = helper.resolve(str, data, def);
    let translate = i18n.translate(locale, resolved);
    return translate;
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
    let locale  = data.user.profile.locale;

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
            let carousel = data.context.get('carousel', []);
            carousel.push(outMsg.data.attachments[0]);

            // Forward data without sending anything
            return node.send(data);
            
        } else {
            let carousel = data.context.get('carousel', []);
            if (carousel.length > 0){
                carousel.push(outMsg.data.attachments[0])
                outMsg.attachmentLayout(builder.AttachmentLayout.carousel);
                outMsg.data.attachments = carousel;
                data.context.set('carousel', []); // clean
            }
        }
    }

    let reply = () => {
        msbot.replyTo(data.context.get('bot'), data.message, outMsg, () => {
            if (!config.prompt){ node.send(data); }
        });
    }

    // Send Message
    msbot.typing(data.context.get('session'), () => {
        let delay = TYPING_DELAY_CONSTANT;
        delay += config.delay !== undefined ? parseInt(config.delay) : 0
        setTimeout(reply, delay)
    });
}

const getButtons = (locale, config, data) => {
    if (data.buttons) return data.buttons
    let buttons = [];

    let pfx = config.sendType === 'quick' ? 'quick' : '';
    for (let idx = 0 ; idx < 11 ; idx++){
        if (!config[pfx+'bt'+idx+'lbl']){ break; } // Stop ASAP to avoid holes in list
        buttons.push({ 
            "title":  marshall(locale, config[pfx+'bt'+idx+'lbl'],    data, ''), 
            "action": marshall(locale, config[pfx+'bt'+idx+'action'], data, ''), 
            "value":  marshall(locale, config[pfx+'bt'+idx+'value'],  data, '') 
        })
    }

    return buttons.length > 0 ? buttons : undefined;
}
