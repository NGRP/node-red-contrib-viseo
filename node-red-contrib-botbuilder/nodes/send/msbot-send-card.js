
const path    = require('path');
const builder = require('botbuilder');
const MSBot   = require('../../lib/msbot.js');
const helper  = require('node-red-viseo-helper');

const TYPING_DELAY_CONSTANT = 1000;

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
        console.log(JSON.stringify(config));

    // Go for prompt
    if (config.prompt){
        MSBot.promptNext(data.message, (prompt) => {
            data.prompt = prompt
            node.send(data); // Forward data
        })
    }

    // Send text message (see MSBot.getMessage() documentation)
    if (config.sendType === 'text'){
        let text = config.text;
        if (config.random){
            let txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }
        outMsg = MSBot.getMessage({type: config.sendType, "text": helper.resolve(text, data, '')});
    }

    // Send media message (see MSBot.getMessage() documentation)
    else if (config.sendType === 'media'){
        outMsg = MSBot.getMessage({type: config.sendType, "media": helper.resolve(config.media, data, '')});
    }

    // Send card message (see MSBot.getMessage() documentation)
    else {
        outMsg = MSBot.getMessage({
            type: config.sendType,
            quicktext: helper.resolve(config.quicktext, data, ''),
            "title"   : helper.resolve(config.title,    data, ''),
            "subtitle": helper.resolve(config.subtitle, data, ''),
            "subtext" : helper.resolve(config.subtext,  data, ''),
            "attach"  : helper.resolve(config.attach,   data, ''),
            "buttons" : getButtons(config, data)
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
        MSBot.replyTo(data.context.get('bot'), data.message, outMsg, () => {
            if (!config.prompt){ node.send(data); }
        });
    }

    // Send Message
    MSBot.typing(data.context.get('session'), () => {
        let delay = TYPING_DELAY_CONSTANT;
        delay += config.delay !== undefined ? parseInt(config.delay) : 0
        setTimeout(reply, delay)
    });
}

const getButtons = (config, data) => {
    if (data.buttons) return data.buttons
    let buttons = [];

    if (config.sendType === 'quick') {
        if (config.quickbt1lbl){ buttons.push({ "title": helper.resolve(config.quickbt1lbl, data, ''), "action": helper.resolve(config.quickbt1action, data, ''), "value": helper.resolve(config.quickbt1value, data, '') })}
        if (config.quickbt2lbl){ buttons.push({ "title": helper.resolve(config.quickbt2lbl, data, ''), "action": helper.resolve(config.quickbt2action, data, ''), "value": helper.resolve(config.quickbt2value, data, '') })}
        if (config.quickbt3lbl){ buttons.push({ "title": helper.resolve(config.quickbt3lbl, data, ''), "action": helper.resolve(config.quickbt3action, data, ''), "value": helper.resolve(config.quickbt3value, data, '') })}
        if (config.quickbt4lbl){ buttons.push({ "title": helper.resolve(config.quickbt4lbl, data, ''), "action": helper.resolve(config.quickbt4action, data, ''), "value": helper.resolve(config.quickbt4value, data, '') })}
        if (config.quickbt5lbl){ buttons.push({ "title": helper.resolve(config.quickbt5lbl, data, ''), "action": helper.resolve(config.quickbt5action, data, ''), "value": helper.resolve(config.quickbt5value, data, '') })}
        if (config.quickbt6lbl){ buttons.push({ "title": helper.resolve(config.quickbt6lbl, data, ''), "action": helper.resolve(config.quickbt6action, data, ''), "value": helper.resolve(config.quickbt6value, data, '') })}
        if (config.quickbt7lbl){ buttons.push({ "title": helper.resolve(config.quickbt7lbl, data, ''), "action": helper.resolve(config.quickbt7action, data, ''), "value": helper.resolve(config.quickbt7value, data, '') })}
        if (config.quickbt8lbl){ buttons.push({ "title": helper.resolve(config.quickbt8lbl, data, ''), "action": helper.resolve(config.quickbt8action, data, ''), "value": helper.resolve(config.quickbt8value, data, '') })}
        if (config.quickbt9lbl){ buttons.push({ "title": helper.resolve(config.quickbt9lbl, data, ''), "action": helper.resolve(config.quickbt9action, data, ''), "value": helper.resolve(config.quickbt9value, data, '') })}
        if (config.quickbt10lbl){ buttons.push({ "title": helper.resolve(config.quickbt10lbl, data, ''), "action": helper.resolve(config.quickbt10action, data, ''), "value": helper.resolve(config.quickbt10value, data, '') })}
        if (config.quickbt11lbl){ buttons.push({ "title": helper.resolve(config.quickbt11lbl, data, ''), "action": helper.resolve(config.quickbt11action, data, ''), "value": helper.resolve(config.quickbt11value, data, '') })}
    } else {
        if (config.bt1lbl){ buttons.push({ "title": helper.resolve(config.bt1lbl, data, ''), "action": helper.resolve(config.bt1action, data, ''), "value": helper.resolve(config.bt1value, data, '') })}
        if (config.bt2lbl){ buttons.push({ "title": helper.resolve(config.bt2lbl, data, ''), "action": helper.resolve(config.bt2action, data, ''), "value": helper.resolve(config.bt2value, data, '') })}
        if (config.bt3lbl){ buttons.push({ "title": helper.resolve(config.bt3lbl, data, ''), "action": helper.resolve(config.bt3action, data, ''), "value": helper.resolve(config.bt3value, data, '') })}
    }

    return buttons.length > 0 ? buttons : undefined;
}
