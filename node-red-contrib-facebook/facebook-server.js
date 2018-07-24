const botmgr    = require('node-red-viseo-bot-manager')
const helper    = require('node-red-viseo-helper');
const request   = require('request-promise');
const CARRIER   = "messenger"

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

let BOTNAME = "Messenger";

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.status({fill:"red", shape:"ring", text: "disconnected (credentials)"});
        config.pageToken = RED.nodes.getCredentials(config.pageToken).token;
        config.verifyToken = node.credentials.verifyToken;

        if (config.pageToken && config.verifyToken) {
            node.status({fill:"green", shape:"dot", text:"connected"});
        }

        start(RED, node, config);
        this.on('close', (done)  => { stop(node, config, done)     });
    }
    RED.nodes.registerType("facebook-server", register, {
        credentials: {
            verifyToken: { type: "text" }
    }});
}

// ------------------------------------------
//  MAIN FUNCTIONS
// ------------------------------------------

let LISTENERS_REPLY = {};
let LISTENERS_PROMPT = {};

const start = (RED, node, config) => {

    // Bind webhook
    RED.httpNode.post ('/facebook-server', (req, res, next) => {

        let body = req.body;

        // Checks this is an event from a page subscription
        if (body.object === 'page') {
            if (!body.entry || body.entry.length < 1 || !body.entry[0].messaging) {
                node.warn({error:'Empty request received', content: body});
                return res.sendStatus(404);
            }

            if (!body.entry[0].messaging[0].message && !body.entry[0].messaging[0].postback) {
                node.warn(body)
                return res.status(200).send('EVENT_RECEIVED');
            }

            body.entry.forEach(function(entry) {
                receive(node, config, entry.messaging[0]);
            });
            
            // Returns a '200 OK' response to all requests
            res.status(200).send('EVENT_RECEIVED');
        } 
        else {
            node.warn(body)
            res.sendStatus(404);
        }
    });

    // Adds support for GET requests to our webhook
    RED.httpNode.get ('/facebook-server', (req, res, next) => {

        // Your verify token. Should be a random string.
        let VERIFY_TOKEN = config.verifyToken;
        
        // Parse the query params
        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];
        
        // Checks if a token and mode is in the query string of the request
        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                res.status(200).send(challenge);
                return node.status({fill:"green", shape:"dot", text:"connected"});
            } 
            else {
                res.sendStatus(403);
                return node.status({fill:"red", shape:"ring", text: "disconnected (webhook)"});
            }
        }
        else node.warn(req.body)
    });

    // Add listener to reply
    let listenerReply = LISTENERS_REPLY[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config) }
    helper.listenEvent('reply', listenerReply)

    let listenerPrompt = LISTENERS_PROMPT[node.id] = (srcNode, data, srcConfig) => { prompt(node, data, config) }
    helper.listenEvent('prompt', listenerPrompt)
}

const stop = (node, config, done) => {
    let listenerReply = LISTENERS_REPLY[node.id]
    helper.removeListener('reply', listenerReply)

    let listenerPrompt = LISTENERS_PROMPT[node.id]
    helper.removeListener('prompt', listenerPrompt)
    done();
}

// ------------------------------------------
//  MIDDLEWARE
// ------------------------------------------

const receive = (node, config, json) => {

    if (json.attachments) {
        json.message = json.messag || {}
        json.message.text = "";
        json.message.type = json.attachments[0].type;
        json.attachments = json.attachments
    }

    else if (json.postback) {
        json.message = json.messag || {}
        json.message.type = "text";
        json.message.text = json.postback.payload;
    }

    else json.message.type = "text";
    
    let data = botmgr.buildMessageFlow({ message : json }, {
        userId:     'message.sender.id', 
        convId:     'message.sender.id',
        payload:    'message.message.text',
        inputType:  'message.message.type',
        source:     CARRIER
    })

    
    //let context = getMessageContext(data.message);

    // Handle Prompt
    let convId  = botmgr.getConvId(data);
    if (botmgr.hasDelayedCallback(convId, data.message)) return;

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    node.send([data]);

}


// ------------------------------------------
// PROMPT
// ------------------------------------------

const prompt = (node, data, config) => {

    const next = function() {
        if (helper.countListeners('prompt') === 1) {
            helper.fireAsyncCallback(data);
        }
    }

    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== CARRIER) return next();

    node.warn({"type": "prompt", "data": data});

    /*
    if (data.prompt.request.intent && data.prompt.request.intent.name === "RawText") {
        data.prompt.message.text = json.request.intent.slots.Text.value;
    }
    if (data.prompt.request.type === "LaunchRequest")       data.prompt.message.text = "START CONVERSATION";
    if (data.prompt.request.type === "SessionEndedRequest")data.prompt.message.text = "END CONVERSATION";
    */

    next();
}
    

// ------------------------------------------
//  REPLY
// ------------------------------------------

async function reply(node, data, config) {

    // Assume we send the message to the current user address
    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== CARRIER) return false;

    try {

        // Assume we send the message to the current user address
        let address = botmgr.getUserAddress(data)
        if (!address || address.carrier !== CARRIER) return false;

        // Building the message
        let message = getMessage(data.reply, botmgr.getConvId(data));
        node.warn(message)
        if (!message) return false;
        
        // Write the message 
        let req = {
            uri: "https://graph.facebook.com/v2.6/me/messages?access_token=" + config.pageToken,
            method: 'POST',
            body: message,
            json: true
        }

        /*
        if (message.filedata) {
            req.form = message;
        }
        else {
            req.body= message;
            req.json= true;
        }*/

        try {
            let res = await request(req);
        }
        catch(err) {
            node.warn({error: err});
            return false;
        }

        // Trap the event in order to continue
        helper.fireAsyncCallback(data);

    } catch(ex){ console.log(ex) }
}

const getMessage = exports.getMessage = (replies, psid) => { 
    if (!replies) return;
    let reply = replies[0];

    let msg = {
        "recipient":{
          "id": psid
        },
        "message": {}
    }

    if (reply.type === "text") {
        msg.message.text = reply.text;
    }

    else if (reply.type === 'quick') {
        msg.message.text = reply.quicktext;
        msg.message.quick_replies = [];

        for (let button of reply.buttons) {
            if (button.action === "askLocation" )           msg.message.quick_replies.push({"content_type":"location"});
            else if (button.action === "sendEmail" )        msg.message.quick_replies.push({"content_type":"user_email"});
            else if (button.action === "sendPhoneNumber" )  msg.message.quick_replies.push({"content_type":"user_phone_number"});
            else msg.message.quick_replies.push({"content_type":"text", "title": button.title, "payload": button.value });
        }
    }

    else if (reply.type === "media") {
        msg.message.attachment = {
            "type":     "image",
            "payload": {
                url: reply.media
            }
        }

        /*
        if (reply.media.match(/^http/i)) {
            msg.message.attachment.payload.url = reply.media;
        }
        else {
            msg.message.attachment.payload.is_reusable = true;
            msg.filedata = '@' + reply.media + ';type=image/';
            if (reply.media.match(/png$/i)) msg.filedata += 'png';
            else if (reply.media.match(/gif$/i)) msg.filedata += 'gif';
            else if (reply.media.match(/(jpg|jpeg)$/i)) msg.filedata += 'jpeg';
            else msg.filedata += 'tiff';
        }
        */
    }

    
    else if (reply.type === "signin") {
        msg.response.outputSpeech = {
            "type":     "SSML",
            "ssml":     (reply.speech === false) ? reply.speech : '<speak>' + reply.text + '</speak>' 
        };

        msg.response.card = {
            "type":     "LinkAccount"
        };
    }

    else if (reply.type === "card") {

        let cardText = reply.subtext || reply.subtitle;
        msg.message.attachment = {
            "type":     "template",
            "payload": {
                "template_type": "generic"
            }
        }

          // Media template (URL should be from Facebook)
        if (!cardText && !reply.title && reply.attach) {
            msg.message.attachment.payload.template_type = "media";
            msg.message.attachment.payload.elements = [];
            for (let rep of replies) {
                cardText = rep.subtext || rep.subtitle;
                msg.message.attachment.payload.elements.push({
                    "media_type": "image",
                    "url": rep.attach,
                    "buttons": [getButton(rep.buttons[0])]
                })
            }
        } // Button template
        else if (cardText && !reply.title && !reply.attach) {
            msg.message.attachment.payload.template_type = "button";
            msg.message.attachment.payload.text = rep.subtext || rep.subtitle;
            msg.message.attachment.payload.buttons = [];
            for (let button of reply.buttons) {
                msg.message.attachment.payload.buttons.push(getButton(button));
            }
        } // Generic template
        else {
            msg.message.attachment.payload.elements = [];
            for (let rep of replies) {
                let obj = {}
                if (rep.title) obj.title = rep.title;
                obj.subtitle = rep.subtext || rep.subtitle;
                obj.image_url = rep.attach;
                obj.buttons = [];
                for (let button of rep.buttons) {
                    obj.buttons.push(getButton(button));
                }

                msg.message.attachment.payload.elements.push(obj);
            }
        }
    }



    /*
    if (!msg.response.card.type) {
        msg.response.outputSpeech = {
            "type":     "SSML",
            "ssml":     '<speak>Oops, something wrong happened...</speak>'
        };
        msg.response.card = {
            "type":     "Simple",
            "title":    BOTNAME + " said",
            "content":  "Oops, something wrong happened..."
        };
    }
    */
    return msg;
}

function getButton(button) {
    switch(button.action) {
        //value, button.title;

        case "postBack":
            return {
                "type": "postback",
                "title": button.title,
                "payload":button.value
            };
        case "openUrl":
            return {
                "type": "web_url",
                "url": button.value,
                "title": button.title
            };
        case "share":
            return {
                "type":"element_share",
                "share_contents": {
                        "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "generic",
                            "elements": [
                                {
                                    "title":     button.sharedCard.title,
                                    "subtitle":  button.sharedCard.text,
                                    "image_url": button.sharedCard.media,
                                    "buttons": [
                                    {
                                        "type": "web_url",
                                        "url":   helper.absURL(button.sharedCard.url),
                                        "title": button.sharedCard.button
                                    }]
                                }]
                            }
                        }
                    }
            };
        case "call":
            return {
                "type":"phone_number",
                "title": button.title,
                "payload": button.value
            };
        default:
              return {}
        }
}