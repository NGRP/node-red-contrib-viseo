const mustache = require('mustache');

const botmgr   = require('node-red-viseo-bot-manager');
const helper   = require('node-red-viseo-helper');



const marshall = (str, data, def) => {
    if (!str) return def;

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

        let manager = new FacebookMessages(this);

        this.repeat = (data)     => { manager.manageMessage(RED, node, data, config, data.reply) };
        this.on('input', (data)  => { manager.manageMessage(RED, node, data, config, null)  });
    }
    RED.nodes.registerType("facebook-send-card", register, {});

}


function getButtons(RED, config, data) {
    if (data.buttons) return data.buttons;
    
    if (!config.buttons || !config.buttons.length || config.buttons.length === 0) {
        return undefined;
    }

    let buttons = JSON.parse(JSON.stringify(config.buttons));
    let btns = [];

    for (let button of buttons){
        let btn = {
            type: button.type
        };
        switch(button.type) {
            case 'postBack':
                btn.title = marshall(button.title, data, '');
                btn.payload = marshall(button.payload, data, '');
                btn.regexp = marshall(button.regexp, data, '');
                break;
            case 'web_url':
                btn.title = marshall(button.title, data, '');
                btn.url = marshall(button.url, data, '');
                btn.webview_height_ratio = button.webview_height_ratio;
                btn.fallback_url = marshall(button.fallback_url, data, '');
                break;
            case 'account_link':
                btn.url = marshall(button.url, data, '');
                break;
            case 'account_unlink':
                break;
            case 'phone_number':
                btn.title = marshall(button.title, data, '');
                btn.payload = marshall(button.payload, data, '');
                break;
            case 'payment':
                btn.title = marshall(button.title, data, '');
                btn.payload = marshall(button.payload, data, '');
                btn.payment_summary = helper.getContextValue(RED, node, data, config.payment_summary, config.payment_summaryType || 'msg');
                break;
            case 'element_share':
                btn.title = marshall(button.title, data, '');
                let card = {
                    "title": helper.getContextValue(RED, node, data, config.share_title, config.share_titleType || 'str'),
                    "subtitle": helper.getContextValue(RED, node, data, config.share_subtitle, config.share_subtitleType || 'str'),
                    "image_url": helper.getContextValue(RED, node, data, config.share_image_url, config.share_image_urlType || 'str'),
                    "default_action": {
                      "type": "web_url",
                      "url": helper.getContextValue(RED, node, data, config.share_default_action_url, config.share_default_action_urlType || 'str')
                    },
                    "buttons": [
                      {
                        "type": "web_url",
                        "url": helper.getContextValue(RED, node, data, config.share_button_url, config.share_button_urlType || 'str'),
                        "title": helper.getContextValue(RED, node, data, config.share_button, config.share_buttonType || 'str')
                      }
                    ]
                }

                btn.share_contents = {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "generic",
                            "elements": [card]
                        }
                    }
                }
                break;
        }
        btns.push(btn);
    }
    return btns.slice(0, 3);;
}

function getQuickReplies(RED, config, data) {
    if (data.buttons) return data.buttons;
    if (!config.quickreplies || !config.quickreplies.length || config.quickreplies.length === 0) {
        return undefined;
    }
    let buttons = JSON.parse(JSON.stringify(config.quickreplies));
    let quickreplies = []; 

    for (let button of buttons){
        let quickreply = {
            content_type: button.content_type
        };
        if (button.content_type === "text") {
            quickreply.title = marshall(button.title, data, '');
            quickreply.payload = marshall(button.payload, data, '');
            quickreply.image_url = marshall(button.image_url, data, '');
        }
        quickreplies.push(quickreply);
    }
    return quickreplies.slice(0, 11);;
}


class FacebookMessages extends botmgr.MessageManager {
    constructor(node) {
        super(node);
    }

    buildReply(RED, node, data, config) {

        let reply = {
            "source"    : "facebook-send-card",
            "type"      : config.sendType,
            "prompt"    : config.prompt,
            "receipt"   : data._receipt,
            "message"   : {}
        };

        // Metadata
        if (config.metadata) {
            let metadata = helper.getContextValue(RED, node, data, config.metadata, config.metadataType || 'msg');
            reply.message.metadata = (typeof metadata === "object") ? JSON.stringify(metadata) : String(metadata);
        }

        // Simple text message
        if (config.sendType === "text") {
            let text = marshall(config.text, data, '');
            if (config.random){
                let txt = text.split('\n');
                text = txt[Math.round(Math.random() * (txt.length-1))]
            }

            reply.message.text = text;
            let quickreplies = getQuickReplies(RED, config, data);
            if (quickreplies) {
                this.buttonsStack.push(data, quickreplies);
                reply.message.quickreplies = quickreplies;
            }
        }

        else if (config.sendType === "attachment") {
            let attachment = {
                "type": config.attachmentContent,
                "payload":{
                    "is_reusable":true
                }
            }

            let attachSource = helper.getContextValue(RED, node, data, config.attachment, config.attachmentType || 'str');
            switch (config.attachmentSource) {
                case 'url':
                    attachment.payload.url = attachSource;
                    break;
                case 'attachment_id': 
                    attachment.payload = { attachment_id: attachSource };
                    break;
                case 'file':
                    attachment.file = {
                        path: attachSource,
                        contentType: helper.getContextValue(RED, node, data, config.attachmentContentType, config.attachmentContentTypeType || 'str')
                    };
            }

            reply.message.attachment = attachment;
            let quickreplies = getQuickReplies(RED, config, data);
            if (quickreplies) {
                this.buttonsStack.push(data, quickreplies);
                reply.message.quickreplies = quickreplies;
            }
        }
        
        else if (config.sendType === "button") {
            let attachment = {
                "type": "template",
                "payload":{
                    "template_type":"button"
                }
            }

            let text = marshall(config.text, data, '');
            if (config.random){
                let txt = text.split('\n');
                text = txt[Math.round(Math.random() * (txt.length-1))]
            }
            attachment.payload.text = text;
            let buttons = getButtons(RED, config, data);
            if (buttons) {
                this.buttonsStack.push(data, buttons);
                attachment.payload.buttons = buttons;
            }
            reply.message.attachment = attachment;
        }

        else if (config.sendType === 'media'){
            let attachment = {
                "type": "template",
                "payload":{
                    "template_type": "media",
                    "elements": []
                }
            }

            let media = helper.getContextValue(RED, node, data, config.media, config.mediaType || 'str');
            let button = getButtons(RED, config, data).slice(0, 1);

            let card = {
                media_type: config.mediaContent
            }

            card[config.mediaSource] = media;
            if (card.buttons) {
                card.buttons = button;
                this.buttonsStack.push(data, card.buttons);
            }

            attachment.payload.elements.push(card);
            reply.message.attachment = attachment;
        }
        
        else if (config.sendType === 'generic'){

            let buttons = getButtons(RED, config, data);
            if (buttons) {
                this.buttonsStack.push(data, buttons);
            }
            let card = {
                "title":helper.getContextValue(RED, node, data, config.title, config.titleType || 'str'),
                "image_url":helper.getContextValue(RED, node, data, config.image_url, config.image_urlType || 'str'),
                "subtitle":helper.getContextValue(RED, node, data, config.subtitle, config.subtitleType || 'str'),
                "default_action": {
                    "type": "web_url",
                    "url": helper.getContextValue(RED, node, data, config.default_action_url, config.default_action_urlType || 'str'),
                    "webview_height_ratio": config.default_action
                },
                "buttons": buttons  
            }

            let context = botmgr.getContext(data);

            // Continue carousel
            if (config.carousel){
                let carousel = context.carousel = context.carousel || [];
                carousel.push(card);
                return;    
            }

            // Send carousel
            let carousel = context.carousel = context.carousel || [];
            if (carousel.length > 0){
                carousel.push(card)
                context.carousel = []; // clean
            }

            if (config.carouselFormat === 'carousel') {

                reply.message.attachment = {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "image_aspect_ratio": (config.square) ? "square" : "horizontal",
                        "sharable": config.sharable,
                        "elements": carousel
                    }
                }
            } 
            else {
                let payload = helper.getContextValue(RED, node, data, config.carouselButtonPayload, config.carouselButtonPayloadType || 'str');
                let title = helper.getContextValue(RED, node, data, config.carouselButtonTitle, config.carouselButtonTitleType || 'str');
                let btn = undefined;
                
                if (title) {
                    btn = {
                        "title": title,
                        "type": config.carouselButton,
                        "payload": (button.type === "postBack") ? payload : undefined,
                        "url": (button.type === "postBack") ? undefined : payload
                    }
                }

                reply.message.attachment = {
                    "type": "template",
                    "payload": {
                        "template_type": "list",
                        "top_element_style": (config.top_element) ? "large" : "compact",
                        "sharable": config.sharable,
                        "elements": carousel,
                        "buttons": [btn]
                    }
                }
                
            }
            
            if (!config.prompt) {
                this.buttonsStack.clear();
            }

            return reply;
        }
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
