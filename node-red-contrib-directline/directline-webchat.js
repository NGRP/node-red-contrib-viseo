const helper = require('node-red-viseo-helper');
const botmgr = require('node-red-viseo-bot-manager');
const uuidv4 = require('uuid/v4');
const formidable = require('formidable');
const WebSocket  = require('ws');
const fs = require('fs');

const LRUMap = require('./lru.js').LRUMap;
let contexts = new LRUMap(CONFIG.server.contextLRU || 10000);

// --------------------------------------------------------------------------
//  VARIABLES
// --------------------------------------------------------------------------

const CARRIER = "Directline";
const EXPIRES = 1800;
const CONTENT_TYPE = {
    "jpeg": "image/jpeg",
    "svg" : "image/svg+xml",
    "mpeg": "audio/mpeg",
    "mp4" : "video/mp4",
    "jpg" : "image/jpg",
    "gif" : "image/gif",
    "png" : "image/png",
};

let TYPING = 1000;
let BOT_ID = "007";
let BOT_NAME = "Super Agent";
let BOT_LOCALE = "en-US";
let UPLOAD = "/tmp/";
let LISTENERS_REPLY = {};

let opts = {};


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        start(RED, node, config);
        this.on('close', (done)  => { stop(node, config, done) });
    }
    RED.nodes.registerType("directline-webchat", register, { 
        credentials : { secret: { type : "text" }}
    });
}

// ------------------------------------------
//  LRU CONTEXT
// ------------------------------------------

const start = (RED, node, config) => {   

    function missingConf(error) {
        return node.status({ fill:"red", shape:"ring", text: error});
    }

    if (!config.config) return missingConf("Directline configuration missing");

    let conf = RED.nodes.getNode(config.config);
    
    if (!conf || !conf.credentials || !conf.credentials.secret || !conf.domain ) {
        node.error("Directline configuration missing");
        return missingConf("Directline configuration missing");
    }

    let protomatch = new RegExp(/^https:\/\//i);
    let botServer = conf.domain.replace(/\/$/, '');
    if (!protomatch.test(botServer)) {
        node.error("Incorrect directline server: must start with 'https'");
    }

    node.status({});     

    // Get parameters
    
    //let webchatUrl = config.webchat;
    let secret = conf.credentials.secret;
    if (config.agentId) BOT_ID = config.agentId;
    if (config.agentName) BOT_NAME = config.agentName;
    if (config.locale) BOT_LOCALE = config.locale;
    if (config.typing) TYPING = Number(config.typing);
    if (config.upload) UPLOAD = config.upload;

    opts = {
        server: RED.server,
        //webchatUrl: webchatUrl,
        botServer: botServer,
        socketServer: botServer.replace(protomatch, "wss://")
    }

    // Init bot server
    app = RED.httpNode;
    
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        next();
    });

    // Create conversation
    app.post('/v3/directline/conversations', function (req, res) {
        startConversation(req, res, secret);
    });

    // receives a message
    app.post('/v3/directline/conversations/:conversationId/activities', function (req, res) {
        receive(req, res, node, config);
    });

    // receives an attachment
    app.post('/v3/directline/conversations/:conversationId/upload', (req, res) => {
        receiveAttachments(req, res, node, config);
    });

    app.get('/v3/directline/conversations/:conversationId', function (req, res) { 
        res.status(200).end();
    });
    
    app.post('/v3/directline/tokens/refresh', function (req, res) {
        refreshToken(req, res);
    });

    app.post('/v3/directline/tokens/generate', function (req, res) {
        generateToken(req, res, secret);
    });

    // map tokens / convId
    app.get('/v3/directline/conversations/:conversationId/activities', (req, res) => {
        let conversationId = (req.params) ? req.params.conversationId : null;
        if (!conversationId) res.status(400).end();
        let context = contexts.get(conversationId);
        if (!context) res.status(500).end();
        else res.status(200).json(context.history);
    });

    // Add listener to reply
    let listenerReply = LISTENERS_REPLY[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config) }
    helper.listenEvent('reply', listenerReply)
}

const stop = (node, config, done) => {
    let listenerReply = LISTENERS_REPLY[node.id]
    helper.removeListener('reply', listenerReply)
    done();
}

// ------------------------------------------
//  TOKEN
// ------------------------------------------

function refreshToken(req, res) {
    console.log("---- called refresh")
    let auth = req.headers.authorization;
    if (!auth) return res.status(403).send();

    let conversationId;
    contexts.forEach(function (value, key) {
        if (value.token === auth) conversationId = key;
    })
    if (!conversationId) {
        return res.status(403).send();
    }
    let context = contexts.get(conversationId);
    if (!context || !context.history) return res.status(403).send();
    let newToken = Buffer.from(uuidv4()).toString('base64');
    context.token = 'Bearer ' + newToken;
    contexts.set(conversationId, context);

    let response = { 
        "conversationId": conversationId,
        "expires_in": EXPIRES,
        "token" : newToken
    };

    return res.status(200).json(response);
}

function generateToken(req, res, secret) {
    let auth = req.headers.authorization;
    if (!auth || auth !== ('Bearer ' + secret)) res.status(403).send();
    let session = createSession();
    if (!session) res.status(500).send();
    else res.status(200).send(session);
}

function createSession(secret) {

    let context;
    let conversationId;
    console.log('create session')

    // Random and unique conversationId
    for (i=0; i<10; i++) {
        conversationId = uuidv4();
        context = contexts.get(conversationId);
        if (!context) break;
    }
    if (context && context.connector) {
        console.log('error')
        return;
    }

    // Create the connector
    let connector = new WebSocket.Server({ 
        server: opts.server, 
        path: `/v3/directline/conversations/${conversationId}/stream`
    })

    // Response
    let token = secret || Buffer.from(uuidv4()).toString('base64');
    let session = {
        history: [],
        token: "Bearer " + token,
        connector: connector,
        streamToken: Buffer.from(uuidv4()).toString('base64')
    }
    

    // Connection
    contexts.set(conversationId, session);
    connector.on('connection', function connection(ws) {
        console.log('connected')
        ws.on('message', function incoming(message) {
         });
        ws.on('close', function disconnect(ws) {
            connector.close();
            contexts.delete(conversationId);
            console.log('disconnected');
        });
    });

    return {
        "conversationId": conversationId,
        "token": token,
        "expires_in": EXPIRES
    };
}

function startConversation(req, res, secret) {

    let context;
    let conversationId;

    if (!req.headers.authorization) { // No authorization header in req
        return res.status(403).send();
    }
    else if (req.headers.authorization === ('Bearer ' + secret)) { // Secret method : no token to give back
        console.log('here')
        let session = createSession(secret);
        if (!session) res.status(500).send();
        let context = contexts.get(session.conversationId);
        let streamUrl  = `${opts.socketServer}/v3/directline/conversations/${session.conversationId}/stream?t=${context.streamToken}`;
        let response = { 
            "conversationId": session.conversationId,
            "expires_in": EXPIRES,
            "streamUrl": streamUrl,
            "token" : session.token
        };
        res.status(201).send(response);
    }
    else { 
        console.log("there")
        // Token method
        contexts.forEach(function (value, key) {
            if (value.token === req.headers.authorization) conversationId = key;
        })
        context = contexts.get(conversationId);
        if (!context) return res.status(403).send();
        let streamUrl  = `${opts.socketServer}/v3/directline/conversations/${conversationId}/stream?t=${conversationId}`;
        let response = { 
            "conversationId": conversationId,
            "expires_in": EXPIRES,
            "streamUrl": streamUrl,
            "token" : context.token.replace(/^Bearer /i, '')
        };
        res.status(201).send(response);
    }
}

function receive(req, res, node, config) {

    // Get parameters
    let incomingActivity = req.body;
    let conversationId = (req.params) ? req.params.conversationId : null;
    let token = req.headers.authorization;

    if (!incomingActivity || !conversationId || !token) {
        return res.status(404).send('Missing parameters');
    }

    // Auth
    let context = contexts.get(conversationId);
    if (!context || token !== context.token) {
        return res.status(403).send('Invalid token');
    }
    
    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // Prepare message
    incomingActivity.conversationId = conversationId;
    let data = botmgr.buildMessageFlow({ message : incomingActivity }, {
        userLocale: 'message.locale',
        userId:     'message.from.id', 
        convId:     'message.conversationId',
        payload:    'message.text',
        inputType:  'message.type',
        source:     CARRIER
    })

    // Set message ID
    let num = ("000000" + (context.history.length + 1)).slice(-6);
    incomingActivity.id = `${conversationId}|${num}`;
    context.history.push(incomingActivity);

    res.set({
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36",
        'Authorization': context.token
    }).status(200).json({ "id" : incomingActivity.id });

    // Handle Prompt
    let convId  = botmgr.getConvId(data);
    console.log('----------------')
    console.log(data.message)
    console.log('----------------')
    if (botmgr.hasDelayedCallback(convId, data.message)) return;

    // Date the last message
    incomingActivity.timestamp = incomingActivity.timestamp || (new Date()).toISOString();
    context.lastMessageDate = incomingActivity.timestamp;

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    node.send([data, null]);
}

function receiveAttachments(req, res, node, config) {

    let form = new formidable.IncomingForm();
    form.uploadDir = UPLOAD;
    form.parse(req, function(err, fields, files) {

        let activity;
        let oldPath = files.activity.path;
        let newPath = files.activity.path + '.json';

        try {
            fs.rename(oldPath, newPath , (err) => {
                if (err) throw err;
                activity = require(newPath);
                oldPath = files.file.path;
                newPath = UPLOAD + files.file.name;
                fs.rename(oldPath, newPath , (err) => {
                    if (err) throw err;
                    files.file.path = newPath;
                    activity.attachments = [files.file];

                    req.body = activity;
                    receive(req, res, node, config);
                });
            });
        }
        catch(err) {
            console.log("[Directline] An error occured during files parsing.");
            node.error({
                function: "[Directline] receiveAttachments",
                error: "An error occured during files parsing.",
                content: files
            })
            res.status(500).end();
        }
    });

 
    return;

}

// ------------------------------------------
//  REPLY
// ------------------------------------------

function reply(node, data, config) { 

    try {

        let address = botmgr.getUserAddress(data);
        if (!address || address.carrier !== CARRIER) return false;
        let conversationId = address.conversation.id;
        let context = contexts.get(conversationId);
        if (!conversationId || !context) return false;

        let connector = context.connector;
        let timestamp = data.message.timestamp;

        if (timestamp && context.lastMessageDate !== timestamp) {
            console.log('forget this message:', data.message, 'attended', context.lastMessageDate)
            return false;
        }

        // Typing
        let setTyping = [{
            from: {id: BOT_ID, name: BOT_NAME},
            locale: BOT_LOCALE,
            type: "typing",
            conversationId: conversationId,
            timestamp: (new Date()).toISOString(),
            source: CARRIER,
            id: `${conversationId}|000000`
        }]

        // Create message
        let activities = buildActivities(data.reply, conversationId);
        if (!activities) return console.log("[Directline] Unable to interpret message")

        // Send message
        let client = connector.clients[0];

        let next = function() {
            client.send(JSON.stringify({ activities: setTyping }));
            setTimeout(function() {
                client.send(JSON.stringify({ activities: activities }));
                helper.fireAsyncCallback(data);
            }, TYPING);
        }

        if (client) return next();

        setTimeout(function() {
            client = connector.clients[0];
            if (client) return next();
            else console.log('no client');
        }, 500);

    } catch(ex){ node.warn(ex); }

}

function buildActivities(replies, conversationId) {

    if (!replies || !replies.length || replies.length === 0) return null;
    let timestamp = (new Date()).toISOString();
    let activities = [];

    if (replies.length > 1) {
        let carousel = true;
        for (let reply of replies) {
            if (reply.type !== "card") carousel = false;
        }
        if (carousel) {
            let context = contexts.get(conversationId);
            let num = ("000000" + (context.history.length + 1)).slice(-6);
            let msg = {
                from: {id: BOT_ID, name: BOT_NAME},
                locale: BOT_LOCALE,
                conversationId: conversationId,
                timestamp: timestamp,
                source: CARRIER,
                type: 'message',
                id: `${conversationId}|${num}`,
                attachmentLayout: 'carousel',
                attachments: []
            }

            for (let reply of replies) {
                let buttons = [];
                for (let but of reply.buttons) {
                    buttons.push({ value: but.value, type: but.action, title: but.title })
                }
                msg.attachments.push({
                    contentType: "application/vnd.microsoft.card.hero",
                    content:  {
                        title: reply.title,
                        subtitle: (reply.text) ? reply.subtitle : null,
                        text:  (reply.text) ? reply.text : reply.subtitle,
                        images: (reply.attach) ? [{ url: reply.attach }] : null,
                        buttons: buttons
                    }
                })
            }
            
            context.history.push(msg)
            //contexts.set(conversationId, context);
            return [msg];
        }
    }

    for (let reply of replies) {

        // Get id
        let context = contexts.get(conversationId);
        let num = ("000000" + (context.history.length + 1)).slice(-6);

        let msg = {
            from: {id: BOT_ID, name: BOT_NAME},
            locale: BOT_LOCALE,
            type: "message",
            conversationId: conversationId,
            timestamp: timestamp,
            source: CARRIER,
            id: `${conversationId}|${num}`
        }

        switch(reply.type) {
            case "text":
                msg.text = reply.text;
                break;
            case "quick":
                msg.text = reply.quicktext;
                msg.buttons = reply.buttons;
                break;
            case "card":
                let buttons = [];
                for (let but of reply.buttons) {
                    buttons.push({ value: but.value, type: but.action, title: but.title })
                }
                msg.attachments = [{
                    contentType: "application/vnd.microsoft.card.hero",
                    content:  {
                        title: reply.title,
                        subtitle: (reply.text) ? reply.subtitle : null,
                        text:  (reply.text) ? reply.text : reply.subtitle,
                        images: (reply.attach) ? [{ url: reply.attach }] : null,
                        buttons: buttons
                    }
                }];

                break;
            case "signin": 
                msg.attachments = [{
                    contentType: "application/vnd.microsoft.card.signin",
                    content: {
                        text: reply.text,
                        buttons: [{
                            title: reply.title,
                            type: "signin",
                            value: reply.url
                        }]
                    }
                }];
                break;
            case "media": 
                let url = helper.absURL(reply.media);
                let endUrl = (url.split('.')).pop();
                let type = CONTENT_TYPE[endUrl.toLowerCase()];
            
                msg.attachments = [{
                    contentType: type || "image/png",
                    contentUrl: url
                }];
                break;
            default :
                continue;
        }

        context.history.push(msg)
        //contexts.set(conversationId, context);
        activities.push(msg);
    }

    return activities;
}

