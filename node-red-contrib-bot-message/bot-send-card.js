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

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("send-card", register, {});

    updateFields = function(opts) {
        if (opts.name) this.name = opts.name;
        return;
    }
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
        if (button.action === "share") {
            button.action = marshall(locale, button.action, data, '');

            let shcardtitle = config.shcardtitle;
            if (!config.shcardtitleType) shcardtitle = marshall(locale, shcardtitle,  data, '');
            else if (config.shcardtitleType !== 'str') {
                let loc = (config.shcardtitleType === 'global') ? node.context().global : data;
                shcardtitle = helper.getByString(loc, shcardtitle);
            }
            let shcardimage = config.shcardimage;
            if (!config.shcardimageType) shcardimage = marshall(locale, shcardimage,  data, '');
            else if (config.shcardimageType !== 'str') {
                let loc = (config.shcardimageType === 'global') ? node.context().global : data;
                shcardimage = helper.getByString(loc, shcardimage);
            }
            let shcardurl = config.shcardurl;
            if (!config.shcardurlType) shcardurl = marshall(locale, shcardurl,  data, '');
            else if (config.shcardurlType !== 'str') {
                let loc = (config.shcardurlType === 'global') ? node.context().global : data;
                shcardurl = helper.getByString(loc, shcardurl);
            }
            let shcardbutton = config.shcardbutton;
            if (!config.shcardbuttonType) shcardbutton = marshall(locale, shcardbutton,  data, '');
            else if (config.shcardbuttonType !== 'str') {
                let loc = (config.shcardbuttonType === 'global') ? node.context().global : data;
                shcardbutton = helper.getByString(loc, shcardbutton);
            }

            button.sharedCard = {
                title:  shcardtitle,
                text:   marshall(locale, config.shcardtext,   data, ''),
                media:  shcardimage,
                button: shcardbutton,
                url:    shcardurl
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
    helper.emitAsyncEvent('reply', node, data, config, (newData) => {
        helper.emitAsyncEvent('replied', node, newData, config, () => {})
        if (config.prompt) { 
            return; 
        }
        sendData(node, newData, config);
    });
}

const buildReply = (node, data, config) => {
    let locale = botmgr.getLocale(data);

    // Prepare speech
    let speech = config.speechText ? marshall(locale, config.speechText, data, '') : config.speech;

    let reply = {
        "type"      : config.sendType,
        "speech"    : speech,
        "prompt"    : config.prompt,
        "receipt"   : data._receipt
    };

    delete data._receipt;

    // Simple text message
    if (config.sendType === 'text'){

        let text = marshall(locale, config.text, data, '');

        if (config.random){
            let txt = text.split('\n');
            text = txt[Math.round(Math.random() * (txt.length-1))]
        }

        reply.text = text;

        return [ reply ]

    }

    // Simple media message
    if (config.sendType === 'media'){

        let media = config.media;
        if (!config.mediaType) media = marshall(locale, media,  data, '');
        else if (config.mediaType !== 'str') {
            let loc = (config.mediaType === 'global') ? node.context().global : data;
            media = helper.getByString(loc, media);
        }

        reply.media = media
        return [ reply ]

    }

    // Card "signin" message
    if (config.sendType === 'signin'){

        let signintitle = config.signintitle;
        let signinurl = config.signinurl;

        if (!config.signintitleType) signintitle = marshall(locale, signintitle,  data, '');
        else if (config.signintitleType !== 'str') {
            let loc = (config.signintitleType === 'global') ? node.context().global : data;
            signintitle = helper.getByString(loc, signintitle);
        }

        if (!config.signinurlType) signinurl = marshall(locale, signinurl,  data, '');
        else if (config.signinurlType !== 'str') {
            let loc = (config.signinurlType === 'global') ? node.context().global : data;
            signinurl = helper.getByString(loc, signinurl);
        }

        reply.text  = marshall(locale, config.signintext,  data, '');
        reply.title = signintitle;
        reply.url   = signinurl;

         return [ reply ]
    }


    // Simple event message
    if (config.sendType === 'event'){

        let event = { name : config.eventName  }
        let value = config.eventValue;
        if (!config.eventValueType || config.eventValueType === 'str'){
            event.value = marshall(locale, value,  data, '');
        }
        else if (config.eventValueType === 'msg') {
            event.value = helper.getByString(data, value);
        }
        else if (config.eventValueType === 'global') {
            event.value = helper.getByString(node.context().global, value);
        }
        else if (config.eventValueType === 'json') {
            event.value = JSON.parse(value);
        }
        reply.event = event
        return [ reply ]
    }

    // Other card message
    let buttons = getButtons(locale, config, data);
    buttonsStack.push(data, buttons);
    reply.buttons = buttons;


    // Quick replies
    if (config.sendType === 'quick') {
        reply.quicktext = marshall(locale, config.quicktext, data, '');
        if (config.random){
            let txt = reply.quicktext.split('\n');
            reply.quicktext = txt[Math.round(Math.random() * (txt.length-1))]
        }
    } 
    else if (config.sendType === 'card') {

        let title = config.title;
        let attach = config.attach;

        if (!config.titleType) title = marshall(locale, title,  data, '');
        else if (config.titleType !== 'str') {
            let loc = (config.titleType === 'global') ? node.context().global : data;
            title = helper.getByString(loc, title);
        }
        if (!config.attachType) attach = marshall(locale, attach,  data, '');
        else if (config.attachType !== 'str') {
            let loc = (config.attachType === 'global') ? node.context().global : data;
            attach = helper.getByString(loc, attach);
        }
        
        reply.title =    title;
        reply.subtitle = marshall(locale, config.subtitle,  data, '');
        reply.subtext =  marshall(locale, config.subtext,   data, '');
        reply.attach =   attach;
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

    return carousel.length > 0 ? carousel : [ reply ];
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
                let buttonValue = (button.value || '').replace(new RegExp(/\:/g),"\\:")
                let rgxp = new RegExp(button.regexp || '^'+buttonValue+'$', 'i');
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
                    rgxp = new RegExp('^'+buttonValue+'$', 'i');
                    if (!rgxp.test(testValue)) {
                        continue;
                    }
                }

                acceptValue = true;

                if (promptText){ 
                    helper.setByString(data, promptText, button.value, (ex) => { node.warn(ex) });
                } else {
                    helper.setByString(data, "prompt.text", button.value, (ex) => { node.warn(ex) });
                }

                if (config.btnOutput || config.quickOutput){ 
                    out[i+1] = data;
                    // Even if the button match, emit a prompt event for logs, etc ...
                    helper.emitAsyncEvent('prompt', node, data, config, (data) => { 
                        node.send(out);
                    });
                    return 
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