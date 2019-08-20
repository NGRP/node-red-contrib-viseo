const helper = require('node-red-viseo-helper')
const botmgr = require('node-red-viseo-bot-manager')
const uuidv4 = require('uuid/v4');
const CARRIER = "SocketIOServer"

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

let Server = require('socket.io');


module.exports = function(RED) {

    RED.httpAdmin.post("/socketioserver/:id", RED.auth.needsPermission("inject.write"), function(req,res) {
        let node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                startIOServer(RED);
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error("[SocketIO Server] Error trying to restart the IO server");
            }
        } else {
            res.sendStatus(404);
        }
    });

    const registerConfig = function (config) {
        let node  = this;
        RED.nodes.createNode(node, config);
        node.name = config.name;

        startIOServer(RED);
        node.on('close', stopIOServer);
    }

    const registerNode = function(config) {
        let node = this;
        RED.nodes.createNode(this, config);

        bindIOServer(node, config);
        this.on('close', (done)  => { removeListeners(node, done) });
    }

    RED.nodes.registerType("socketio-server-config", registerConfig);
    RED.nodes.registerType("socketio-server",        registerNode, { credentials: { secret: {type: "text"}} });
}

// ------------------------------------------
//  SocketIO
// ------------------------------------------

let CALLBACK_REPLY = {};
let CLIENTS = [];
let io;

const log = (msg, data) => {
    console.log("[SocketIO Server] " + msg, data || '');
}

const stopIOServer = () => {
    if (!io) { return; }

    log("Disconnect all sockets...");
    for (let client of Object.values(CLIENTS)) client.socket.disconnect(true);
    io.removeAllListeners('connection');
    CLIENTS = {};
}

const startIOServer = (RED) => {
    stopIOServer();
    CLIENTS = {};
    log("Starting WebSocket server...");
    io = new Server(RED.server);
}

const bindIOServer = (node, config) => {
    if (!io) { return log("WebSocket server not available..."); }

    let namespace = config.namespace || 'assistant';
    log("Bind WebSocket server on " + namespace);

    io.on('connection', (socket) => {
        let client = { "socket" : socket, replies : {} }
        CLIENTS[client.socket.id] = client;

        socket.emit(namespace, { event: '[SocketIO Server] connected' });
        socket.on(namespace,    (data)   => { receive(node, config, client, data)});
        socket.on('disconnect', (reason) => { cleanClient(socket); log("Disconnected: ", reason); })
        socket.on('error',      (error)  => { log("Error: ", error) })
    });
    io.on('connect_error',      (error) => { log("Error: connect_error - ",    error) })
    io.on('connect_timeout',    (error) => { log("Error: connect_timeout - ",  error) })
    io.on('reconnect_error',    (error) => { log("Error: reconnect_error - ",  error) })
    io.on('reconnect_failed',   (error) => { log("Error: reconnect_failed - ", error) })

    // Add listener to reply
    let callback = CALLBACK_REPLY[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config); }
    helper.listenEvent('reply', callback)
}

const removeListeners = (node, next) => {
    let callback = CALLBACK_REPLY[node.id]
    helper.removeListener('reply', callback)
    next();
}

const cleanClient = (socket) => {
    delete CLIENTS[socket.id]
}

// ------------------------------------------
//  RECEIVE
// ------------------------------------------

const receive = (node, config, client, message) => {
    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // The UI can send message to acknowledge messages
    if (message.type === 'ack'){
        let replyId = message.data;
        let data    = client.replies[replyId];
        if (data){
            delete client.replies[replyId];
            return helper.fireAsyncCallback(data);
        }
    }

    // Set the convId to the socketId 
    message.socket = client.socket.id

    // Bind ClientID to socket's data (if provided)
    if (message._client_id){
        client._client_id = message._client_id
        message.socket = client._client_id // override the convId with a generic reference
    }

    let data = botmgr.buildMessageFlow({ "message" : message }, {
        userId:     'message._client_id',
        convId:     'message.socket',
        payload:    'message.content',
        inputType:  'message.type',
        source:     CARRIER
    })

    // Handle Prompt
    let convId  = botmgr.getConvId(data);
    if (botmgr.hasDelayedCallback(convId, data.message)) return;

    // Trigger received message
    helper.emitAsyncEvent('received', node, data, config, (data) => {
        node.send(data);
    });
}

// ------------------------------------------
//  REPLY
// ------------------------------------------

const reply = (node, data, config) => {

    let namespace = config.namespace || 'assistant';

    try {

        let address = botmgr.getUserAddress(data)
        if (!address || address.carrier !== CARRIER) return false;

        // Building the message
        let message = getMessage(data.reply);
        if (!message) return false;

        // Emit the message
        let socket  = botmgr.getConvId(data);
        let client  = CLIENTS[socket];
        if (!client){
            let userId = data.user.id
            if (!userId){ return node.warn('Client SocketId ' + socket + ' not found ')}

            // Find the first client matching given userID has a fallback
            for (let sock of Object.keys(CLIENTS)){
                let c = CLIENTS[sock]
                if (c._client_id === userId){
                    client = c;
                    // node.warn('Override Conversation ID: ' + client.socket.id)
                    // helper.setByString(data, 'user.address.conversation.id', client.socket.id)
                    node.warn('Conversation ID custom: ' +  botmgr.getConvId(data))
                    break;
                }
            }

            if (!client){
                node.warn('Client SocketId ' + socket + ' not found for userId '+ userId)
                return;
            }
        }

        // Store a replyId x data to a given Socket
        // and wait client acknowledge message
        // to call: helper.fireAsyncCallback(data);
        let replyId = uuidv4();
        client.replies[replyId] = data;
        client.socket.emit(namespace, { message, replyId });

    } catch(ex){ node.warn(ex) }
}


// ------------------------------------------
//  MESSAGES
//  https://github.com/api-ai/fulfillment-webhook-nodejs/blob/master/functions/index.js
// ------------------------------------------

// https://api.ai/docs/fulfillment#response
// doc : https://actions-on-google.github.io/actions-on-google-nodejs/modules/conversation_response.html
// doc : https://actions-on-google.github.io/actions-on-google-nodejs/modules/conversation_question.html

const getMessage = exports.getMessage = (replies) => {

    if (!replies || replies.length === 0) return;

    // Carousel of cards
    if (replies.length > 1){
        let msg = {
            type: 'carousel',
            prompt: false,
            cards: []
        }

        for (let card of replies) {
            if (card.prompt) msg.prompt = true;
            delete card.prompt;
            msg.cards.push(card) ;
        }
        return msg;
    }

    return replies[0];
}
