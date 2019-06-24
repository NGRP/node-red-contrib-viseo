const helper  = require('node-red-viseo-helper');
const botmgr  = require('node-red-viseo-bot-manager');
const request  = require('request-promise');
const WebSocket = require('ws');
const EventEmitter = require('events');


const CARRIER = "Zendesk";

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        let infos = RED.nodes.getNode(config.token);

        if (!infos || !infos.credentials || !infos.infos || !infos.credentials.token) {
            node.status({fill:"red", shape:"ring", text: "disconnected"});
            return node.error("Credentials missing");
        }
        else {
            config.client_infos = infos.infos;
            config.client_infos.token = infos.credentials.token;
        }

        start(RED, node, config);
        this.on('close', (done)  => { stop(node, config, done) });
    }
    RED.nodes.registerType("zendesk-server", register);
}

let emitter;
let webSocket;
let webSocketUrl;
let messageSubscriptionId; // ID 0

let LISTENERS_REPLY = {};
let LISTENERS_TRANSFER = {};

// Specific listeners
let LISTENERS_AGENTS = {};
let LISTENERS_HANDOVER = {};
let LISTENERS_SENT = {};

let TYPING_TIME = 1000;
let BOT_NAME;

async function startSession (client_infos) {

    const query = `
        mutation {
        startAgentSession(access_token: "` + client_infos.token + `") {
          websocket_url
          session_id
          client_id
        }
      }
      `;

    try {
        let result = await request({   
            method: "post", 
            uri: "https://chat-api.zopim.com/graphql/request",
            body: JSON.stringify({ query }),
            headers: { 'Content-Type': 'application/json' }
        });

        return JSON.parse(result);
    }
    catch(err) {
        throw(err);
    }
}

async function conversationManager(RED, node, config) {

    if (!webSocketUrl) {
        try {
            let session  = await startSession(config.client_infos);
            webSocketUrl = session.data.startAgentSession.websocket_url;
        }
        catch(err) {
            node.error("Invalid token");
            return node.send([null, {error : err}]);
        }
    }

    let updateAgentStatusID;   // 1
    let pingPong = true;
    webSocket = new WebSocket(webSocketUrl);

    // Ping pong
    let pingPongGame = setInterval(function(){
        if (pingPong) {
            webSocket.send(JSON.stringify({"sig": "PING", "payload": "pingPong"}));
            pingPong = false;
        }
        else {
            console.log('[Zendesk] Reconnect websocket')
            clearInterval(pingPongGame);
            setTimeout( function() { conversationManager(RED, node, config); }, 60000);
        }
    }, 40000);

    // Initilization
    webSocket.on('open', () => {
        console.log('[Zendesk] Connection opened');
        node.status({fill:"green", shape:"dot", text:"connected"});

        // messageSubscriptionQuery
        webSocket.send(JSON.stringify({
            payload: { query: "subscription { message { node { content channel { id } from { __typename display_name id } } } }" },
            type: 'request', id: 0
        }));

        // updateAgentStatusQuery
        webSocket.send(JSON.stringify({
            payload: { query: "mutation { updateAgentStatus(status: ONLINE) { node { id } } }" },
            type: 'request', id: 1
        }));
          
    });

    // Get messages from visitors
    webSocket.on('message', function(message) {
        message = JSON.parse(message);

        if (message.sig === "PONG") pingPong = true;

        else if (message.id === 0) {
            if (message.errorCode) {
                node.error({ "subscription" : message });
                node.send([null, {message : message}]);
            }
            else if (!message.payload.data || !message.payload.data.subscription_id) {
                node.error({ "subscription" : { error: "empty response", message: message }});
                node.send([null, {message : message}]);
            }
            messageSubscriptionId = message.payload.data.subscription_id;
            console.log(`[Zendesk] Subscription to messages ("${messageSubscriptionId}")`);
        }

        else if (message.id === 1) {
            if (message.errorCode) {
                node.error({ "updateAgentStatus" : message });
                node.send([null, {message : message}]);
            }
            else if (!message.payload.data || !message.payload.data.updateAgentStatus ||
                !message.payload.data.updateAgentStatus.node || !message.payload.data.updateAgentStatus.node.id ) {
                node.error({ "updateAgentStatus" : { error: "empty response", message: message }});
                node.send([null, {message : message}]);
            }

            updateAgentStatusID = message.payload.data.updateAgentStatus.node.id;
            console.log(`[Zendesk] Agent is online ("${updateAgentStatusID}")`);
        }

        else if (message.id === 2) {
            if (message.errorCode) {
                node.error({ "sendMessage" : message });
                node.send([null, {message : message}]);
            }
            else if (!message.payload.data) {
                node.error({ "sendMessage" : { error: "empty response", message: message }});
                node.send([null, {message : message}]);
            }
            else {
                let messageType = Object.keys(message.payload.data)[0];
                if (message.payload.data[messageType].success !== true) {
                    node.error({ "sendMessage" : { error: "wrong response", message: message }});
                    node.send([null, {message : message}]);
                }
                else emitter.emit('messsage_sent');
            }
        }

        else if (message.id === 3) {
            let agents = message.payload.data.agents.edges;
            emitter.emit('agents', agents);
        }

        else if (message.id === 4) {
            emitter.emit('handover', message);
        }

         // Listen to chat messages from the visitor
        else if (
            message.sig === 'DATA' && message.subscription_id === messageSubscriptionId &&
            message.payload.data && message.payload.data.message && message.payload.data.message.node && 
            message.payload.data.message.node.from.__typename === "Visitor"
        ) {
            receive(message.payload.data.message.node, node, config);
        }
    });

    webSocket.on('close', function(log) { 
        node.status({fill:"red", shape:"dot", text:"disconnected"});
    })

    webSocket.on('error', function(log) {
        webSocketUrl = '';
    })
}

async function start (RED, node, config) {  

    if (config.client_infos.typing) TYPING_TIME = Number(config.client_infos.typing);
    BOT_NAME = config.bot_name;

    class NodeEmitter extends EventEmitter {}
    emitter = new NodeEmitter();

    // Restart websocket client
    if (webSocket) webSocket.close();
    node.status({fill:"red", shape:"ring", text: "disconnected"});

    // si le websocketurl n'est plus valide ?
    conversationManager(RED, node, config);

    // Add listener to reply
    let listenerReply = LISTENERS_REPLY[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config) }
    helper.listenEvent('reply', listenerReply)

    let listenerTransfer = LISTENERS_TRANSFER[node.id] = (srcNode, data, srcConfig) => { transfer(node, data, srcConfig) }
    helper.listenEvent('transfer', listenerTransfer)

}

function stop (node, config, done) {
    webSocket.send(JSON.stringify({ payload: { "subscription_id": messageSubscriptionId }, type: 'stop_subscription', id: 9 }));
    webSocket.close();

    let listenerReply = LISTENERS_REPLY[node.id];
    helper.removeListener('reply', listenerReply);
    let listenerTransfer = LISTENERS_TRANSFER[node.id];
    helper.removeListener('transfer', listenerTransfer);

    done();
}


// ------------------------------------------
//  LRU REQUESTS
// ------------------------------------------

const LRUMap = require('./lru.js').LRUMap;
const uuidv4 = require('uuid/v4');

let _CONTEXTS    = new LRUMap(CONFIG.server.contextLRU || 10000);
let _CONTEXT_KEY = 'contextId';

function getMessageContext (message) {
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

function receive (chatMessage, node, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    let data = botmgr.buildMessageFlow({ message : chatMessage }, {
        userId:     'message.from.id', 
        userName:   'message.from.display_name', 
        convId:     'message.channel.id',
        payload:    'message.content',
        source:     CARRIER
    })

    let context = getMessageContext(data.message);
        context.channel = chatMessage.channel.id;

    // Handle Prompt
    let convId  = botmgr.getConvId(data);
    if (botmgr.hasDelayedCallback(convId, data.message)) return;

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    
    node.send([data, null]);

}

// ------------------------------------------
//  REPLY
// ------------------------------------------

function reply (node, data, config) { 
    try {

        let address = botmgr.getUserAddress(data)
        if (!address || address.carrier !== CARRIER) return false;

        // The address is not used because we reply to HTTP Response
        let context = data.prompt ? getMessageContext(data.prompt) : getMessageContext(data.message);
        let query = getQuery(data.reply, context.channel);

        if (!query) return console.log('[Zendesk] Unable to interpret message');

        let setTypingIndicator = {
            payload: { query: `mutation { setTypingIndicator(backoff: true, channel_id: "${context.channel}", typing: true) { success } }`},
            type: 'request', id: 7
        };
        let unsetTypingIndicator = {
            payload: { query: `mutation { setTypingIndicator(backoff: true, channel_id: "${context.channel}", typing: false) { success } }` },
            type: 'request', id: 8
        };

        // Building the message
        let sendMessageQuery = {
            payload: { query: query },
            type: 'request', id: 2
        };
        
        LISTENERS_SENT[context.channel] = function() {
            helper.fireAsyncCallback(data);
            emitter.removeListener('messsage_sent', LISTENERS_SENT[context.channel]);
        }
        emitter.addListener('messsage_sent', LISTENERS_SENT[context.channel]);

        // Sending the message
        webSocket.send(JSON.stringify(setTypingIndicator));
        setTimeout(function() {
            webSocket.send(JSON.stringify(unsetTypingIndicator));
            webSocket.send(JSON.stringify(sendMessageQuery));
        }, TYPING_TIME);

    } catch(ex){ node.warn(ex); }

}

// ------------------------------------------
//  TRANSFER
// ------------------------------------------

function transfer (node, data, config) {

    let context = getMessageContext(data.message);
        context.agents = { data: data };

    // Listen for transfer result
    function transferToAgent(agentId) {
        let transferToAgentQuery = { 
            payload: { 
                query: `mutation { inviteAgent( agent_id: "${agentId}", channel_id: "${context.channel}", leave: true ) { success } }`
            }, type: 'request', id: 4
        };

        LISTENERS_HANDOVER[context.channel] = function(result) {
            if (result.payload.errors) data.payload = { error : result.payload.errors };
            else data.payload = result.payload;
            helper.fireAsyncCallback(data);
            emitter.removeListener('handover', LISTENERS_HANDOVER[context.channel]);
        }
        emitter.addListener('handover', LISTENERS_HANDOVER[context.channel]);
        webSocket.send(JSON.stringify(transferToAgentQuery));
    }
    
    let agent_id = config.agent_id;
    if (agent_id) {
        if (config.itemidType === 'msg') agent_id = helper.getByString(data, agent_id);
        return transferToAgent(agent_id);
    }

    // Get agents
    const getAgentssQuery = {
        payload: { query: "query { agents { edges { node { id name display_name status } } } }" },
        type: 'request', id: 3
    };

    // Listen for new agents

    LISTENERS_AGENTS[context.channel] = function(agents) {
        let onlineAgents = agents.filter( agent => (agent.node.status === 'ONLINE' && agent.node.name !== BOT_NAME));
        if (onlineAgents.length > 0) {
            const pickRandomAgent = Math.floor(Math.random() * onlineAgents.length);
            const onlineAgent = onlineAgents[pickRandomAgent].node.id;
            return transferToAgent(onlineAgent);
        } else {
            let address = botmgr.getUserAddress(data);
            if (!address || address.carrier !== CARRIER) return next();
            data.payload = { error : "no_online_agent" };
            helper.fireAsyncCallback(data);
        }
        emitter.removeListener('agents', LISTENERS_AGENTS[context.channel]);
    }
    emitter.addListener('agents', LISTENERS_AGENTS[context.channel]);
    webSocket.send(JSON.stringify(getAgentssQuery));
}


// ------------------------------------------
//  MESSAGES
//  https://graphql-docs.com/docs/Mutation/?graphqlUrl=https://chat-api.zopim.com/graphql/request
// ------------------------------------------

function getQuery (replies, channel_id) {

    if (!replies) return;

    if (replies.length > 1) {
        let items = '[';
        for (let i=0; i<replies.length; i++) {
            let reply = replies[i];
            if (reply.type !== "card") break;
            if (!reply.title || !reply.subtitle || !reply.attach) break;

            // Buttons
            let url = reply.buttons.shift().value;
            let buttons = '[';
            for (let button of reply.buttons) {
                let type = (button.action === 'openUrl') ? 'LINK_ACTION' : 'QUICK_REPLY_ACTION';
                buttons += `{ 
                    action: { value: "${button.value}", type: ${type} }, 
                    text: "${button.title}"
                },`;
            }
            buttons = buttons.substring(0,buttons.length-1) + ']';

            items += `{ 
                buttons: ${buttons},
                panel: {
                    heading: "${reply.title}",
                    paragraph: "${reply.subtitle}",
                    image_url: "${reply.attach}",
                    action: { value: "${url}" }
                }
            },`;
        }

        items = items.substring(0,items.length-1) + ']';

        let query = `mutation { 
            sendPanelTemplateCarousel(
                channel_id: "${channel_id}", 
                items: ${items}
            ){ 
                success 
            }
        }`

        return query;
    }

    let reply = replies[0];
    if (reply.type === "text") {
        let query = `mutation { 
            sendMessage(channel_id: "${channel_id}", msg: "${reply.text}")
            { success }
        }`
        return query;
    }
    
    if (reply.type === "quick") {

        // Quickreplies
        let buttons = '[';
        for (let button of reply.buttons) { 
            buttons += `{ action: { value: "${button.value}" }, text: "${button.title}"},`;
        }
        buttons = buttons.substring(0,buttons.length-1) + ']';

        // Query
        let query = `mutation { 
            sendQuickReplies(
                channel_id: "${channel_id}", 
                msg: "${reply.quicktext}", 
                quick_replies: ${buttons}
            ){ 
                success 
            }
        }`
        
        return query;
    }

    if (reply.type === "card") {

         // Query
        if (reply.title && reply.subtitle && reply.attach) {

            // Buttons
            let url = reply.buttons.shift().value;
            let buttons = '[';
            for (let button of reply.buttons) {
                let type = (button.action === 'openUrl') ? 'LINK_ACTION' : 'QUICK_REPLY_ACTION';
                buttons += `{ 
                    action: { value: "${button.value}", type: ${type} }, 
                    text: "${button.title}"
                },`;
            }
            buttons = buttons.substring(0,buttons.length-1) + ']';

            let query = `mutation { 
                sendPanelTemplate(
                    channel_id: "${channel_id}", 
                    panel: {
                        heading: "${reply.title}",
                        paragraph: "${reply.subtitle}",
                        image_url: "${reply.attach}",
                        action: { value: "${url}" }
                    }, 
                    buttons: ${buttons}
                ){ 
                    success 
                }
            }`

            return query;
        }

        // Buttons
        let buttons = '[';
        for (let button of reply.buttons) {
            let type = (button.action === 'openUrl') ? 'LINK_ACTION' : 'QUICK_REPLY_ACTION';
            buttons += `{ 
                action: { value: "${button.value}", type: ${type} }, 
                text: "${button.title}"
            },`;
        }
        buttons = buttons.substring(0, buttons.length-1) + ']';

        let msg = reply.subtitle || reply.title;
        let query = `mutation { 
            sendButtonTemplate(
                channel_id: "${channel_id}", 
                msg: "${msg}", 
                buttons: ${buttons}
            ){ 
                success 
            }
        }`
        
        return query;
    }

    return "";
}
