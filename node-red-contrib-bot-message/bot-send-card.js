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

        this.repeat = (data)  => { input(RED, node, data, config, data.reply) };
        this.on('input', (data)  => { input(RED, node, data, config, null)  });
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

const getButtons = (RED, locale, config, data) => {
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

const input = (RED, node, data, config, reply) => {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }
    
    let convId = botmgr.getConvId(data)

    // Prepare the prompt
    if (config.prompt){
        botmgr.delayCallback(convId, (prompt) => {
            data.prompt = prompt
            node.warn({ prompt: data})
            sendData(node, data, config)
        })
    }

    // Retrieve replies
    let replies = reply || buildReply(RED, node, data, config);

    if (!replies){ 
        sendData(node, data, config); 
        return;
    }
    
    // Emit reply message
    data.reply = replies;
    data._replyid = node.id;
    
    if (config.metadata) {
        switch (config.metadataType) {
            case 'msg':
                data.metadata = data[config.metadata];
                break;
            case 'flow':
                data.metadata = node.context().flow.get(config.metadata);
                break;
            case 'global':
                data.metadata = node.context().global.get(config.metadata);
                break;
            case 'str':
                data.metadata = config.metadata;
                break;
            case 'num':
                data.metadata = +config.metadata;
                break;
            case 'bool':
                data.metadata = config.metadata === 'true';
                break;
            case 'json':
                data.metadata = JSON.parse(config.metadata);
                break;
        }
    }

    helper.emitAsyncEvent('reply', node, data, config, (newData) => {
        helper.emitAsyncEvent('replied', node, newData, config, () => {})
        if (config.prompt) { 
            return; 
        }
        sendData(node, newData, config);
    });
}

const buildReply = (RED, node, data, config) => {
    let locale = botmgr.getLocale(data);
    let reply = {
        "type"      : config.sendType,
        "prompt"    : config.prompt,
        "receipt"   : data._receipt,
        "notification": data.notification
    };

    // Simple event message
    if (config.sendType === 'event'){
        let value = helper.getContextValue(RED, node, data, config.eventValue, config.eventValueType || 'str');
        let event = { 
            name: config.eventName,
            value: (typeof value === "string") ? marshall(locale, value,  data, '') : value
        }
        reply.event = event;
    }
    else { // Prepare speech
        reply.speech = (config.speech) ? "" : marshall(locale, config.speechText, data, '');
        delete data._receipt;
        delete data.notification;
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
    if (config.sendType === 'quick' || config.sendType === 'card' || config.sendType === 'adaptiveCard') {
    
        let buttons = getButtons(RED, locale, config, data);
        buttonsStack.push(data, buttons);
        reply.buttons = buttons;

        if (config.sendType === 'quick') {
            reply.quicktext = marshall(locale, config.quicktext, data, '');
            if (config.random){
                let txt = reply.quicktext.split('\n');
                reply.quicktext = txt[Math.round(Math.random() * (txt.length-1))]
            }
            if (reply.speech === undefined) reply.speech = reply.quicktext;
        } 
        else if (config.sendType === 'card') {

            let title  = helper.getContextValue(RED, node, data, config.title, config.titleType || 'str');
            let attach = helper.getContextValue(RED, node, data, config.attach, config.attachType || 'str');
            
            reply.title =    marshall(locale, title,  data, '');
            reply.subtitle = marshall(locale, config.subtitle,  data, '');
            reply.subtext =  marshall(locale, config.subtext,   data, '');
            reply.attach =   marshall(locale, attach,  data, '');
            if (reply.speech === undefined) reply.speech = reply.subtitle || reply.subtext;
        }
        else if (config.sendType === 'adaptiveCard') {
            buildReplyAdaptiveCard(locale, data, config, reply);

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

/**
 * Takes the "whole" text and builds a "body" for the adaptive card.
 * @param {*} whole The whole text to process
 * @param {*} body The parameter in which to put the processed text, see adaptive card documentation
 * @param {*} separator The parameter used as a section separator. Each line of text is finally a container, with title containers non-clickable and item container clickable.
 */
const buildAdaptiveCardJson = function(whole, body, separator) {
    /**Original text is:
     **Memory**:
     - 1. Item memory 1
     **Storage**:
      - 1. Item storage 1
      - 2. Item storage 2
     **Note**:
      - 1. Item Note 1
     **Standard**:
      - 1. Item Standard 1
    -----------------------------------------       
    
    part is:  with index: 0
     line is:  with index: 0
     ---------------
     part is: Memory**:
      - 1. Item memory 1
      with index: 1
     line is: Memory**: with index: 0
     line is:  - 1. Item memory 1 with index: 1
     line is:  with index: 2
     ---------------
     part is: Storage**:
       - 1. Item storage 1
       - 2. Item storage 2
      with index: 2
     line is: Storage**: with index: 0
     line is:   - 1. Item storage 1 with index: 1
     line is:   - 2. Item storage 2 with index: 2
     line is:  with index: 3
     ---------------
     part is: Note**:
       - 1. Item Note 1
      with index: 3
     line is: Note**: with index: 0
     line is:   - 1. Item Note 1 with index: 1
     line is:  with index: 2
     ---------------
     part is: Standard**:
       - 1. Item Standard 1 with index: 4
     line is: Standard**: with index: 0
     line is:   - 1. Item Standard 1 with index: 1
    */
    
           //TODO refactor
    
           whole.split(' '+ separator).forEach((part, index) => {
            if (index === 0) {
                // begins with title directly
                if (part.startsWith(' '+ separator, 0)) { 
                    body.push({
                      "type": "Container",
                      "items": [
                          {
                              "type": "TextBlock",
                              "wrap": true,
                              "size": "default",
                              "text": part //  here is what I found...
                          }	
                      ]
                  });
                } else { 
                    // Otherwise, begin with attributes belong to last title
                    part.split('\n').forEach((line, i) => {
                        let btnVal = line.substring(4).trim(); // remove '   - ' ahead of string
                        body.push({
                                  "type": "Container",
                                  "items": [
                                      {
                                          "type": "TextBlock",
                                          "wrap": true,
                                          "size": "default",
                                          "text": line						
                                      }
                                  ],
                                  "selectAction": {
                                      "type": "Action.Submit",
                                      "title": "cool link",
                                      "data":{"__isBotFrameworkCardAction": true, "type": "postBack", "value": 'FindSku_' + btnVal}
                                  }
                                });
                            });
              }
            } else {
                part.split('\n').forEach((line, i) => {
                    if (i === 0) {
                        body.push({
                          "type": "Container",
                          "items": [
                              {
                                  "type": "TextBlock",
                                  "wrap": true,
                                  "size": "default",
                                  "text": separator + line // memory
                              }
                          ]});
                    } else {
                        let btnVal = line.substring(4).trim(); // remove '   - ' ahead of string
                        body.push({
                                  "type": "Container",
                                  "items": [
                                      {
                                          "type": "TextBlock",
                                          "wrap": true,
                                          "size": "default",
                                          "text": line						
                                      }
                                  ],
                                  "selectAction": {
                                      "type": "Action.Submit",
                                      "title": "cool link",
                                      "data":{"__isBotFrameworkCardAction": true, "type": "postBack", "value": 'FindSku_' + btnVal}
                                  }
                                });
                    }
            });
        }
    });
}

const buildReplyAdaptiveCard = (locale, data, config, reply) => {
    //--- same as card
    let title = config.titleAdaptiveCard;
    let attach = config.attachAdaptiveCard;
    let subtext = config.textAdaptiveCard;
    let separator = config.containerSeparatorAdaptiveCard;
    let displayedTextSize = config.displayedTextSizeAdaptiveCard;
   
    if (!separator) {
        separator = "**";
    }

    if (!displayedTextSize) {
        // if not defined value, then don't wrap, display up to 100k characters.
        displayedTextSize = 100000;
    }

    if (!config.titleTypeAdaptiveCard) title = marshall(locale, title,  data, '');
    else if (config.titleTypeAdaptiveCard !== 'str') {
        let loc = (config.titleTypeAdaptiveCard === 'global') ? node.context().global : data;
        title = helper.getByString(loc, title);
    }

    if (!config.attachTypeAdaptiveCard) attach = marshall(locale, attach,  data, '');
    else if (config.attachTypeAdaptiveCard !== 'str') {
        let loc = (config.attachTypeAdaptiveCard === 'global') ? node.context().global : data;
        attach = helper.getByString(loc, attach);
    }

    reply.type = 'AdaptiveCard';
    reply.title = title;
    reply.attach = attach;
    reply.version = "1.0";
    reply.body = [];
    /*customized text to display*/
    
    let textToShow = marshall(locale, subtext,  data, '');

    // if textToShow is too big and has to be wrapped up to <displayedTextSize> characters
    if (textToShow.length > displayedTextSize) {
        let tmp = textToShow.substring(0, displayedTextSize);

        // in case Markdown Emphasis got truncated...
        let empIndex = tmp.lastIndexOf(" "+ separator);
        if (empIndex> 0 && tmp.substring(empIndex+ 2).lastIndexOf(separator) < 0) tmp += separator;

        // in case hiperlink got truncated...
        let linkBegin = tmp.lastIndexOf("](http");
        let linkEnd;
        if (linkBegin > 0) {
          linkEnd = textToShow.substring(linkBegin).indexOf(")");
          if (linkEnd > 0) tmp = textToShow.substring(0, linkBegin + linkEnd + 1);
        }

        // assure attribute complete
        let attrIndex = (tmp.lastIndexOf("\n") < linkBegin + linkEnd + 1) ? (linkBegin + linkEnd + 1) : tmp.lastIndexOf("\n");
        tmp = textToShow.substring(0, attrIndex);
        buildAdaptiveCardJson(tmp, reply.body, separator); //reply.body.push({"type": "TextBlock", "text": tmp, "size": "default", "wrap": true});

        reply.actions = [];
        tmp = textToShow.substring(attrIndex);

        //reply.actions.push({"type": "Action.ShowCard", "title": "More", "card": {"type": 'AdaptiveCard', "body": [{"type": "TextBlock", "text": tmp, "size": "default", "wrap": true}]}});
        reply.actions.push({"type": "Action.ShowCard", "title": "More", "card": {"type": 'AdaptiveCard', "body": []}});
        buildAdaptiveCardJson(tmp, reply.actions[0].card.body, separator);
        
    } else {
        // otherwise show all the text
        //reply.body.push({"type": "TextBlock", "text": textToShow, "size": "default", "wrap": true});
        buildAdaptiveCardJson(textToShow, reply.body, separator);
    }
}