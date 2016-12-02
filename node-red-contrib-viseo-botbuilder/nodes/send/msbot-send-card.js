
const path    = require('path');
const builder = require('botbuilder');
const MSBot   = require('../../lib/msbot.js');

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
            var txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }
        outMsg = MSBot.getMessage({"text": text}, data);
    }

    // Send media message (see MSBot.getMessage() documentation)
    else if (config.media){
        outMsg = MSBot.getMessage({"media": config.media}, data);
    }

    // Send card message (see MSBot.getMessage() documentation)
    else {
        outMsg = MSBot.getMessage({
            "title"   : (config.title    || undefined),
            "subtitle": (config.subtitle || undefined),
            "subtext" : (config.subtext  || undefined),
            "attach"  : (config.attach   || undefined),
            "buttons" : getButtons(config)
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

const getButtons = (config) => {
    let buttons = [];
    if (config.bt1lbl){ buttons.push({ "title": config.bt1lbl, "action": config.bt1action, "value": config.bt1value })}
    if (config.bt2lbl){ buttons.push({ "title": config.bt2lbl, "action": config.bt2action, "value": config.bt2value })}
    if (config.bt3lbl){ buttons.push({ "title": config.bt3lbl, "action": config.bt3action, "value": config.bt3value })}
    return buttons.length > 0 ? buttons : undefined;
}
