
const path     = require('path');
const builder  = require('botbuilder');
const mustache = require('mustache');
const msbot    = require('../../lib/msbot.js');
const i18n     = require('../../lib/i18n.js');
const helper   = require('node-red-viseo-helper');

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

const buttonsStack = {
    push: function(data, buttons) {
        if(data._buttonsStack === undefined) {
            data._buttonsStack = [];
        }
        data._buttonsStack = data._buttonsStack.concat(buttons);
    },
    popAll: function(data) {
        let buttons = data._buttonsStack;       
        data._buttonsStack = []; 
        return buttons;
    }
};

const getButtons = (locale, config, data) => {
    if (data.buttons) return data.buttons
    
    let buttons = undefined
    if (config.sendType === 'quick'){
        buttons = JSON.parse(JSON.stringify(config.quickreplies));
    } else if (config.sendType === 'card'){
        buttons = JSON.parse(JSON.stringify(config.buttons));
    }

    if (!buttons || buttons.length <= 0) return;
    for (let button of buttons){
        if (!button.title || !button.action || !button.value) continue;

        button.title  = marshall(locale, button.title,  data, '')
        button.action = marshall(locale, button.action, data, '')
        button.value  = marshall(locale, button.value,  data, '')
        button.regexp = marshall(locale, button.regexp, data, '')

    }
    return buttons;
}

const input = (node, data, config) => {
    let outMsg  = undefined;
    let locale = msbot.getLocale(data);
    let convId = msbot.getConvId(data)

    // Go for prompt
    if (config.prompt){
        helper.delayCallback(convId, (prompt) => {
            data.prompt = prompt
            sendData(node, data, config)
        })
    }

    // Prepare speech
    let speech = config.speechText ? marshall(locale, config.speechText, data, '') : config.speech;

    // Send text message (see msbot.getMessage() documentation)
    if (config.sendType === 'text'){
        let text = config.text;
        if (config.random){
            let txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }
        outMsg = msbot.getMessage({
            "type"   : config.sendType, 
            "text"   : marshall(locale, text, data, ''),
            "speech" : speech
        });
    }

    // Send media message (see msbot.getMessage() documentation)
    else if (config.sendType === 'media'){
        outMsg = msbot.getMessage({
            "type"  : config.sendType, 
            "media" : marshall(locale, config.media, data, ''),
            "speech": speech
        });
    }

    // Send media message (see msbot.getMessage() documentation)
    else if (config.sendType === 'signin'){
        outMsg = msbot.getMessage({
            "type"  : config.sendType, 
            "text"  : marshall(locale, config.signintext,  data, ''),
            "title" : marshall(locale, config.signintitle, data, ''),
            "url"   : marshall(locale, config.signinurl,   data, ''),
            "speech": speech
        });
    }

    // Send card message (see msbot.getMessage() documentation)
    else {

        let buttons = getButtons(locale, config, data);

        outMsg = msbot.getMessage({
            type: config.sendType,
            quicktext : marshall(locale, config.quicktext, data, ''),
            "title"   : marshall(locale, config.title,     data, ''),
            "subtitle": marshall(locale, config.subtitle,  data, ''),
            "subtext" : marshall(locale, config.subtext,   data, ''),
            "attach"  : marshall(locale, config.attach,    data, ''),
            "buttons" : buttons,
            "speech"  : speech
        }, data);

        buttonsStack.push(data, buttons);
        
        if (config.carousel){
            let carousel = data.context.carousel = data.context.carousel || [];
            carousel.push(outMsg.data.attachments[0]);
            // Forward data without sending anything
            return sendData(node, data, config);
            
        } else {
            let carousel = data.context.carousel = data.context.carousel || [];
            if (carousel.length > 0){
                carousel.push(outMsg.data.attachments[0])
                outMsg.attachmentLayout(builder.AttachmentLayout.carousel);
                outMsg.data.attachments = carousel;
                data.context.carousel = []; // clean
            }

            if(!config.prompt) {
                buttonsStack.popAll(data);
            } //else, buttons popped on prompt
        }
    }

    // Speech Input HINTS
    if (config.speech && config.prompt && outMsg.inputHint){
        outMsg.inputHint('expectingInput');
    }

    // Emit reply message
    data.reply = outMsg;
    helper.emitAsyncEvent('reply', node, data, config, () => {
        helper.emitEvent('replied', node, data, config)
        if (config.prompt){ return; }
        sendData(node, data, config);
    });
}

const sendData = (node, data, config) => {

    let out  = new Array(parseInt(config.outputs || 1));
    let promptText = undefined;

    if (config.promptText) {
        promptText = helper.resolve(config.promptText, data, undefined);
    }

    let _continue = (data) => {
        // 3. REPEAT: the latest output
        if (config.repeat && config.repeat > 0){
            data._tmp = data._tmp || {}
            let cpt = data._tmp['rpt_'+node.id] || 0
            let rpt = parseInt(config.repeat)

            data._tmp['rpt_'+node.id] = cpt + 1;
            if (cpt >= rpt){
                out[out.length -1] = data;
                return node.send(out);        
            }
        }

        // 4. DEFAULT: the first output
        out[0] = data;
        node.send(out);
    }


    if (config.prompt){
        let acceptValue = false;

        // 1. BUTTONS: the middle outputs
        let buttons = buttonsStack.popAll(data);

        //checks whether we should accept the input value
        if(config.assert) {
            let regexp = new RegExp(config.assert, 'i');
            acceptValue = regexp.test(data.prompt.text);
        } else {
            acceptValue = true;
        }
        
        if (promptText && acceptValue) { // Save the prompt value to a given attribute
            helper.setByString(data, promptText, data.prompt.text, (ex) => { node.warn(ex) });
        }
        
        if (buttons) {

            for (let i = 0 ; i < buttons.length ; i++){
                let button = buttons[i]; 

                let rgxp = new RegExp(button.regexp || '^'+button.value+'$', 'i');

                if (!rgxp.test(data.prompt.text)) {
                    rgxp = new RegExp('^'+button.value+'$', 'i');
                    if (!rgxp.test(data.prompt.text)) {
                        continue;
                    }
                }

                //the value was accepted for at least one button
                acceptValue = true;

                if (promptText){ 
                    helper.setByString(data, promptText, button.value, (ex) => { node.warn(ex) });
                }

                if (config.btnOutput || config.quickOutput){ 
                    out[i+1] = data; 
                    return node.send(out);
                } 
            }
        }

        // 2. EVENTS: Cross Messages
        config.promptText = promptText;
        if(config.assert && acceptValue === false) {
            helper.emitAsyncEvent('prompt', node, data, config, (data) => {
                helper.emitAsyncEvent('prompt-unexpected', node, data, config, (data) => {
                    _continue(data);
                });
            });
        } else {
            helper.emitAsyncEvent('prompt', node, data, config, (data) => {  _continue(data); });
        }
        return;
    }
    _continue(data);
}   
