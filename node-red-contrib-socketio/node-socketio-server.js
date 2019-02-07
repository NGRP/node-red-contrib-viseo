const helper = require('node-red-viseo-helper')
const botmgr = require('node-red-viseo-bot-manager')
const CARRIER = "socketServer"


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

let Server = require('socket.io');
let serverConfig = '';
let LISTENERS_REPLY = {};
let LISTENERS_END = {};
let SOCKETS = [];
let io;

module.exports = function(RED) {

    RED.httpAdmin.post("/socketioserver/:id", RED.auth.needsPermission("inject.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                if (io) {
                    for (let socket of SOCKETS) socket.disconnect(true);
                    io.removeAllListeners('connection');
                    SOCKETS = [];
                }
                io = new Server(RED.server);
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error("Error trying to restart the Socketio server");
            }
        } else {
            res.sendStatus(404);
        }
    });

    const ioServer = function (config) {
        RED.nodes.createNode(this, config);
        serverConfig = config;
        var node = this;
        this.name = config.name;

        if (!io) {
            io = new Server(RED.server);
            console.log("[Socket server] Connection to Socket server..."); 
        }

        node.on('close', function() { 
            console.log("[Socket server] Socket server closed");
            for (let socket of SOCKETS) socket.disconnect(true);
            io.removeAllListeners('connection');
            SOCKETS = [];
        });
    }

    const webServer = function(config) {
        var node = this;
        RED.nodes.createNode(this, config);

        startServer(node, config);
        this.on('close', (done)  => { stop(node, done) });
    }

    RED.nodes.registerType("socketio-server-config", ioServer);    
    RED.nodes.registerType("socketio-server", webServer, { credentials: { secret: {type: "text"}} });
}

const startServer = (node, config) => {  

    let namespace = config.namespace || 'assistant';

    io.on('connection', function(socket){
        SOCKETS.push(socket);
        socket.emit(namespace, { event: '[Socket server] Socket connected' });
        socket.on(namespace, function(data){ receive(node, config, socket, data)});
        socket.on('disconnect', function(reason) { console.log("[Socket server] Socket disconnected: " + reason) })
        socket.on('error', function(error) { console.log("[Socket server] Socket error: " + error) })
    });
    io.on('connect_error',    function (error) { console.log("[Socket server] Socket error: connect_error - " + error) })
    io.on('connect_timeout',  function (error) { console.log("[Socket server] Socket error: connect_timeout - " + error) })
    io.on('reconnect_error',  function (error) { console.log("[Socket server] Socket error: reconnect_error - " + error) })
    io.on('reconnect_failed', function (error) { console.log("[Socket server] Socket error: reconnect_failed - " + error) })

    // Add listener to reply
    let listenerReply = LISTENERS_REPLY[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config) }
    helper.listenEvent('reply', listenerReply)

    let listenerEnd = LISTENERS_END[node.id] = (node) => { endSound(node) }
    helper.listenEvent('endSound', listenerEnd)
}        

const stop = (node, done) => {
    
    let listenerReply = LISTENERS_REPLY[node.id]
    helper.removeListener('reply', listenerReply)

    let listenerEnd = LISTENERS_END[node.id]
    helper.removeListener('endSound', listenerEnd)
    done();
}

// ------------------------------------------
//  RECEIVE
// ------------------------------------------

function receive(node, config, socket, message) {

      // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    message.socket = socket.id

    let data = botmgr.buildMessageFlow({ "message" : message }, {
        userId:     'message.socket', 
        convId:     'message.socket',
        payload:    'message.content',
        inputType:  'message.type',
        source:     CARRIER
    })
    

    if (data.message.type === "event") {
        if (data.message.content === "cmd-next") {
            node.warn({'next': data.message})
            return helper.emitEvent('endSound', node);
        }
    }
    else {
        node.warn({'received': data.message})

        // Handle Prompt
        let convId  = botmgr.getConvId(data)
        if (botmgr.hasDelayedCallback(convId, data.message)) return;
    }

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    node.send(data);
}

let msgs = [];
// ------------------------------------------
//  END SOUND
// ------------------------------------------

const endSound = (node) => { 
    if (msgs.length < 1) return;

    // Get the last message and send it in the flow
    
    let data =  msgs.shift();
    helper.fireAsyncCallback(data);
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
        let convId  = botmgr.getConvId(data);
        node.warn({'reply': message, 'convId': convId})
        io.to(convId).emit(namespace, { message: message });

        // Keep it to send it in the flow later
        msgs.push(data)

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


