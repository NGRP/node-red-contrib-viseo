
const mustache = require('mustache');
const i18n     = require('./lib/i18n.js');
const helper   = require('node-red-viseo-helper');
const botmgr   = require('node-red-viseo-bot-manager');

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
        if (!button.title || !button.action || !button.value) continue;

        button.title  = marshall(locale, button.title,  data, '')
        button.action = marshall(locale, button.action, data, '')
        button.value  = marshall(locale, button.value,  data, '')
        button.regexp = marshall(locale, button.regexp, data, '')

    }
    return buttons;
}

const input = (node, data, config) => {
    let convId = botmgr.getConvId(data)

    // Prepare the prompt
    if (config.prompt){
        botmgr.delayCallback(convId, (prompt) => {
            data.prompt = prompt
            sendData(node, data, config)
        })

    }

    // Retrieve replies
    let replies = buildReply(node, data, config);
    if (!replies){ 
        sendData(node, data, config); 
        return;
    }
    
    // Emit reply message
    data.reply = replies;
    helper.emitAsyncEvent('reply', node, data, config, (data) => {
        helper.emitEvent('replied', node, data, config)
        if (config.prompt) { 
            return; 
        }
        sendData(node, data, config);
    });
}

const buildReply = (node, data, config) => {
    let locale = botmgr.getLocale(data);

    // Prepare speech
    let speech = config.speechText ? marshall(locale, config.speechText, data, '') : config.speech;

    // Simple text message
    if (config.sendType === 'text'){
        let text = config.text;
        if (config.random){
            let txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }
        return [{
            "type"   : config.sendType, 
            "text"   : marshall(locale, text, data, ''),
            "speech" : speech,
            "prompt" : config.prompt
        }]
    }

    // Simple media message
    if (config.sendType === 'media'){
        return [{
            "type"   : config.sendType, 
            "media"  : marshall(locale, config.media, data, ''),
            "speech" : speech,
            "prompt" : config.prompt
        }]
    }

    // Card "signin" message
    if (config.sendType === 'signin'){
        return [{
            "type"   : config.sendType, 
            "text"   : marshall(locale, config.signintext,  data, ''),
            "title"  : marshall(locale, config.signintitle, data, ''),
            "url"    : marshall(locale, config.signinurl,   data, ''),
            "speech" : speech,
            "prompt" : config.prompt
        }]
    }

    // Other card message
    let buttons = getButtons(locale, config, data);
    buttonsStack.push(data, buttons);


    let reply = {
        "type": config.sendType,
        "buttons"   : buttons,
        "speech"    : speech,
        "prompt"    : config.prompt
    };


    // Quick replies
    if(config.sendType === 'quick') {
        reply.quicktext = marshall(locale, config.quicktext, data, '');
    } else if(config.sendType === 'card') {
        reply.title = marshall(locale, config.title,     data, '');
        reply.subtitle = marshall(locale, config.subtitle,  data, '');
        reply.subtext = marshall(locale, config.subtext,   data, '');
        reply.attach = marshall(locale, config.attach,    data, '');
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
        buttonsStack.popAll(data);
    } //else, buttons popped on prompt

    return carousel.length > 0 ? carousel : [reply];
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

        return node.send(out);
    }


    if (config.prompt) {

        // 1. BUTTONS: the middle outputs
        let buttons = buttonsStack.popAll(data);

        config.promptText = promptText;

        let acceptValue = false;
        
        if (buttons && buttons.length > 0) {

            for (let i = 0 ; i < buttons.length ; i++){
                let button = buttons[i]; 

                let rgxp = new RegExp(button.regexp || '^'+button.value+'$', 'i');
                let testValue = data.prompt.text

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
                    rgxp = new RegExp('^'+button.value+'$', 'i');
                    if (!rgxp.test(testValue)) {
                        continue;
                    }
                }

                acceptValue = true;

                if (promptText){ 
                    helper.setByString(data, promptText, button.value, (ex) => { node.warn(ex) });
                }

                if (config.btnOutput || config.quickOutput){ 
                    out[i+1] = data; 

                    return node.send(out);
                } 
            }
        } else {

            acceptValue = true;

            if (promptText) { 
                helper.setByString(data, promptText, data.prompt.text, (ex) => { node.warn(ex) });
            }
        }

        if(acceptValue === false) {
            //if we get here, it means that the prompted text doesn't match any button and wasn't expected
            helper.emitAsyncEvent('prompt', node, data, config, (data) => {
                helper.emitAsyncEvent('prompt-unexpected', node, data, config, (data) => {
                    _continue(data);
                });
            });

        } else {
            helper.emitAsyncEvent('prompt', node, data, config, (data) => {  
                _continue(data); 
            });
        }

    } else {
        _continue(data);
    }
}   
