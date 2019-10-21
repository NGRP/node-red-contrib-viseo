const helper  = require('node-red-viseo-helper')
const botmgr  = require('node-red-viseo-bot-manager')
const uuidv4 = require('uuid/v4');

const LRUMap = require('./lib/lru.js').LRUMap;
const { Message } = require('./lib/messages.js');
const CARRIER = "GoogleHome"

const { dialogflow } = require('actions-on-google');
let app = dialogflow({ ordersv3: true });


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
    RED.nodes.registerType("dialogflow-server", register);
}

let LISTENERS_REPLY = {};
let LISTENERS_PROMPT = {};

const start = (RED, node, config) => {  

    // Start HTTP Route
    let uri = '/dialogflow-server/';
    app.fallback(conv => { 
        return new Promise(function(resolve, reject) {
            receive(conv, node, config, resolve, reject);
        }); 
    });


    RED.httpNode.post(uri, app);

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
//  LRU REQUESTS
// ------------------------------------------

// Should it be init in start() ?
let _CONTEXTS    = new LRUMap(CONFIG.server.contextLRU || 10000);
let _CONTEXT_KEY = 'contextId';

const getMessageContext = (message) => {
    if (message === undefined) return;

    let uuid    = helper.getByString(message, _CONTEXT_KEY);
    let context = _CONTEXTS.get(uuid);
    if (!context) {
        context = {};
        let convId = helper.getByString(message, 'address.conversation.id');
              uuid = convId + '-' + uuidv4();
              helper.setByString(message, _CONTEXT_KEY, uuid);
        _CONTEXTS.set(uuid, context);
    }
    return context;
}

// ------------------------------------------
//  RECEIVE
// ------------------------------------------

const receive = (conv, node, config, resolve, reject) => {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    if (!conv || !conv.request) {
        node.warn({error: 'Empty request received', content: conv});
        return;
    }

    let data = botmgr.buildMessageFlow({ message : JSON.parse(JSON.stringify(conv)) }, {
        userLocale: 'message.user.locale',
        userId:     'message.user.storage.userId', 
        convId:     'message.request.conversation.conversationId',
        payload:    'message.input.raw',
        inputType:  'message.input.type',
        source:     CARRIER
    })

    if(data.user.id == "UnknownId") {
        let userId = uuidv4();
        conv.user.storage.userId = data.user.id = userId;
    }

    node.log('RECEIVED :'+ JSON.stringify({
        user : {
            id: data.user.id,
            locale: data.user.locale
        },
        conversation: {
            id: data.user.address.conversation.id
        },
        surfaces: data.message.surface.capabilities.list,
        intent: data.message.intent,
        timestamp: Date.now()
    }));

    let context = getMessageContext(data.message)
        context.conv = conv;
        context.resolve = resolve;
        context.reject = reject;

    // Handle Prompt
    let convId  = botmgr.getConvId(data)
    if (botmgr.hasDelayedCallback(convId, data.message)) {
        return;
    }

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    node.send([data, data]);

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

    // Assume we send the message to the current user address
    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== CARRIER) return next();

    //GEO LOCATION
    if (
        data.prompt.request &&
        data.prompt.request.device && 
        data.prompt.request.device.location
    ) {
        data.user.location = data.prompt.request.device.location;
    }

    //IDENTITY
    if (
        data.prompt.request &&
        data.prompt.request.user &&
        data.prompt.request.user.profile) {
        //EMAIL
        if (data.prompt.request.user.profile.email) {
            data.user.profile.email = data.prompt.request.user.profile.email;
        }
        //NAME
        if (data.prompt.request.user.profile.displayName) {
            data.user.profile.displayName = data.prompt.request.user.profile.displayName;
            data.user.profile.givenName = data.prompt.request.user.profile.givenName;
            data.user.profile.familyName = data.prompt.request.user.profile.familyName;
        }
    }

    next();
}


// ------------------------------------------
//  REPLY
// ------------------------------------------

const reply = (node, data, config) => { 
    try {

        let address = botmgr.getUserAddress(data)
        if (!address || address.carrier !== CARRIER) return false;

        // The address is not used because we reply to HTTP Response
        let context = data.prompt ? getMessageContext(data.prompt)
                                  : getMessageContext(data.message)
        
        let conv = context.conv;
        let resolve = context.resolve;

        // Building the message
        let message = new Message(data.reply);
            message.send(conv);
        
        // Trap the event in order to continue
        helper.fireAsyncCallback(data);
        resolve();

    } catch(ex){ 
        node.warn(ex);
    }

}
