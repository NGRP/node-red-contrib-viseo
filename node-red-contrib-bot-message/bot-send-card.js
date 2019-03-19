const mustache = require('mustache');
const i18n     = require('./lib/i18n.js');
const botmgr   = require('node-red-viseo-bot-manager');
const helper   = require('node-red-viseo-helper');

require('./lib/i18n.js').init();

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

        let manager = new BotbuilderMessages(this);

        this.repeat = (data)     => { manager.manageMessage(RED, node, data, config, data.reply) };
        this.on('input', (data)  => { manager.manageMessage(RED, node, data, config, null)  });
    }
    RED.nodes.registerType("send-card", register, {});

    updateFields = function(opts) {
        if (opts.name) this.name = opts.name;
        return;
    }
}


function getButtons(RED, locale, config, data) {
    if (data.buttons) return data.buttons
    
    let buttons = [];
    if (config.sendType === 'quick'){
        buttons = JSON.parse(JSON.stringify(config.quickreplies));
    } else if (config.sendType === 'card'){
        buttons = JSON.parse(JSON.stringify(config.buttons));
    }

    if (!buttons || buttons.length <= 0) {
        return [];
    }
    for (let button of buttons){
        if (button.action === "share") {
            button.action = marshall(locale, button.action, data, '');

            let shcardtitle =  helper.getContextValue(RED, node, data, config.shcardtitle, config.shcardtitleType || 'str');
            let shcardimage =  helper.getContextValue(RED, node, data, config.shcardimage, config.shcardimageType || 'str');
            let shcardurl =  helper.getContextValue(RED, node, data, config.shcardurl, config.shcardurlType || 'str');
            let shcardbutton =  helper.getContextValue(RED, node, data, config.shcardbutton, config.shcardbuttonType || 'str');

            button.sharedCard = {
                title:  marshall(locale, shcardtitle,  data, ''),
                text:   marshall(locale, config.shcardtext,   data, ''),
                media:  marshall(locale, shcardimage,  data, ''),
                button: marshall(locale, shcardbutton,  data, ''),
                url:    marshall(locale, shcardurl,  data, '')
            }
            continue;
        }
        else if (!button.title || !button.action || !button.value) continue;

        button.title  = marshall(locale, button.title,  data, '')
        button.action = marshall(locale, button.action, data, '')
        button.value  = marshall(locale, button.value,  data, '')
        button.regexp = marshall(locale, button.regexp, data, '')

    }
    return buttons;
}


class BotbuilderMessages extends botmgr.MessageManager {
    constructor(node) {
        super(node);
    }

    buildReply(RED, node, data, config) {
        let locale = botmgr.getLocale(data);
        let reply = {
            "type"      : config.sendType,
            "prompt"    : config.prompt,
            "receipt"   : data._receipt
        };

        // Simple event message
        if (config.sendType === 'event'){
            
            let value = helper.getContextValue(RED, node, data, config.eventValue, config.eventValueType || 'str');
            let event = { 
                name: config.eventName,
                value: marshall(locale, value,  data, '')
            }
            reply.event = event;
        }
        else { // Prepare speech
            reply.speech = (config.speech) ? "" : marshall(locale, config.speechText, data, '');
            delete data._receipt;
        }

        // Simple text message
        if (config.sendType === 'text'){
            let text = marshall(locale, config.text, data, '');
            if (config.random){
                let txt = text.split('\n');
                text = txt[Math.round(Math.random() * (txt.length-1))]
            }

            reply.text = text;
            if (reply.speech === undefined) reply.speech = text;
        }

        // Simple media message
        if (config.sendType === 'media'){
            let media = helper.getContextValue(RED, node, data, config.media, config.mediaType || 'str');
            reply.media = marshall(locale, media,  data, '');

            if (reply.speech === undefined) reply.speech = "";
        }

        // Card "signin" message
        if (config.sendType === 'signin'){


            let signintitle = helper.getContextValue(RED, node, data, config.signintitle, config.signintitleType || 'str');
            let signinurl = helper.getContextValue(RED, node, data, config.signinurl, config.signinurlType || 'str');

            reply.text  = marshall(locale, config.signintext,  data, '');
            reply.title = marshall(locale, signintitle,  data, '');
            reply.url   = marshall(locale, signinurl,  data, '');

            if (reply.speech === undefined) reply.speech = reply.text;
        }

        if(config.sendType === 'confirm') {
            reply.text = marshall(locale, config.confirmtext,  data, '');
        }
        
        // Other card message
        if (config.sendType === 'quick' || config.sendType === 'card') {
        
            let buttons = getButtons(RED, locale, config, data);
            this.buttonsStack.push(data, buttons);
            reply.buttons = buttons;

            if (config.sendType === 'quick') {
                reply.quicktext = marshall(locale, config.quicktext, data, '');
                if (config.random){
                    let txt = reply.quicktext.split('\n');
                    reply.quicktext = txt[Math.round(Math.random() * (txt.length-1))]
                }
                if (reply.speech === undefined) reply.speech = reply.quicktext;
            } 
            else {

                let title  = helper.getContextValue(RED, node, data, config.title, config.titleType || 'str');
                let attach = helper.getContextValue(RED, node, data, config.attach, config.attachType || 'str');
                
                reply.title =    marshall(locale, title,  data, '');
                reply.subtitle = marshall(locale, config.subtitle,  data, '');
                reply.subtext =  marshall(locale, config.subtext,   data, '');
                reply.attach =   marshall(locale, attach,  data, '');
                if (reply.speech === undefined) reply.speech = reply.subtitle || reply.subtext;
            }
        }
        
        // Forward data without sending anything
        let context = botmgr.getContext(data);
        if (config.carousel){
            let carousel = context.carousel = context.carousel || [];
            carousel.push(reply);
            return;    
        }
        
        // Handle carousel
        let carousel = context.carousel = context.carousel || [];
        if (carousel.length > 0){
            carousel.push(reply)
            context.carousel = []; // clean
        }

        if (!config.prompt) {
            this.buttonsStack.get(data);
        } //else, buttons popped on prompt

        return carousel.length > 0 ? carousel : [ reply ];
    }

    isPrompt(config) {
        if (config.prompt) return true;
        else return false;
    }

    sendData(RED, node, data, config, output) {

        output = output || 0;
        let out  = new Array(parseInt(config.outputs || 1));

        // Output is not default
        let buttons = this.buttonsStack.get(data);
        if (output !== 0 && buttons && buttons.length > 0) {
            let value = buttons[output-1].value;
            helper.setByString(data, config.promptText || "prompt.text", value, (ex) => { node.warn(ex) });
        }
        else if (config.promptText) {
            helper.setByString(data, config.promptText, data.prompt.text, (ex) => { node.warn(ex) });
        }
        this.buttonsStack.clear(data);
        
        // Send data
        out[output] = data;
        return node.send(out);
    }

    getOutputNumber(RED, node, data, config) {

        // Repeat
        if (config.repeat && config.repeat > 0) {
            data._tmp = data._tmp || {};
            let cpt = data._tmp['rpt_'+node.id] || 0;
            let rpt = parseInt(config.repeat);
            data._tmp['rpt_'+node.id] = cpt + 1;

            if (cpt >= rpt) {
                let outNumber = parseInt(config.outputs) || 1;
                return (outNumber-1);
            }
        }

        // Buttons
        let buttons = this.buttonsStack.get(data);
        if (buttons && buttons.length > 0) {

            for (let i = 0 ; i < buttons.length ; i++){
                let button = buttons[i]; 
                let buttonValue = (button.value || '').replace(new RegExp(/\:/g),"\\:")
                let rgxp = new RegExp(button.regexp || '^'+buttonValue+'$', 'i');
                let testValue = data.prompt.text;

                if(button.unaccentuate) {
                    testValue = testValue.replace(new RegExp(/\s/g),"");
                    testValue = testValue.replace(new RegExp(/[àáâãäå]/g),"a");
                    testValue = testValue.replace(new RegExp(/æ/g),"ae");
                    testValue = testValue.replace(new RegExp(/ç/g),"c");
                    testValue = testValue.replace(new RegExp(/[èéêë]/g),"e");
                    testValue = testValue.replace(new RegExp(/[ìíîï]/g),"i");
                    testValue = testValue.replace(new RegExp(/ñ/g),"n");                
                    testValue = testValue.replace(new RegExp(/[òóôõö]/g),"o");
                    testValue = testValue.replace(new RegExp(/œ/g),"oe");
                    testValue = testValue.replace(new RegExp(/[ùúûü]/g),"u");
                    testValue = testValue.replace(new RegExp(/[ýÿ]/g),"y");
                }

                if (!rgxp.test(testValue)) {
                    rgxp = new RegExp('^'+buttonValue+'$', 'i');
                    if (!rgxp.test(testValue)) continue;
                }

                if (config.btnOutput || config.quickOutput) return i+1;
            }
        } 

        return 0;
    }
}
