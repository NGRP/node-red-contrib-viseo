
const path    = require('path');
const builder = require('botbuilder');
const MSBot   = require('../../lib/msbot.js');
const helper  = require('node-red-viseo-helper');

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

    // Go for prompt
    if (config.prompt){
        MSBot.promptNext(data.message, (prompt) => {
            data.prompt = prompt
            node.send(data); // Forward data
        })
    }

    // Send text message (see MSBot.getMessage() documentation)
    if (config.text){
        let text = config.text;
        if (config.random){
            let txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }
        outMsg = MSBot.getMessage({"text": helper.resolve(text, data)});
    }

    // Send media message (see MSBot.getMessage() documentation)
    else if (config.media){
        outMsg = MSBot.getMessage({"media": helper.resolve(config.media, data)});
    }

    // Send card message (see MSBot.getMessage() documentation)
    else {
        outMsg = MSBot.getMessage({
            "title"   : helper.resolve(config.title,    data),
            "subtitle": helper.resolve(config.subtitle, data),
            "subtext" : helper.resolve(config.subtext,  data),
            "attach"  : helper.resolve(config.attach,   data),
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
        MSBot.typing(data.context.get('session'));
        MSBot.replyTo(data.context.get('bot'), data.message, outMsg, () => {
            if (!config.prompt){ node.send(data); }
        });
    }

    // Send Message
    if (config.delay > 0){
        setTimeout(reply, config.delay)
    } else {
        reply();
    }
}

const getButtons = (config, data) => {
    let buttons = [];
    if (config.bt1lbl){ buttons.push({ "title": helper.resolve(config.bt1lbl, data), "action": helper.resolve(config.bt1action, data), "value": helper.resolve(config.bt1value, data) })}
    if (config.bt2lbl){ buttons.push({ "title": helper.resolve(config.bt2lbl, data), "action": helper.resolve(config.bt2action, data), "value": helper.resolve(config.bt2value, data) })}
    if (config.bt3lbl){ buttons.push({ "title": helper.resolve(config.bt3lbl, data), "action": helper.resolve(config.bt3action, data), "value": helper.resolve(config.bt3value, data) })}
    return buttons.length > 0 ? buttons : undefined;
}
