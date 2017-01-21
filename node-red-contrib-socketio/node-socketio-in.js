
var io = require('socket.io');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', (done) => { stop(done) });
    }
    RED.nodes.registerType("socketio-in", register, {});
}

const input = (node, data, config) => {
    socket.emit(config.path, data.payload);
    node.send(data);
}

// --------------------------------------------------------------------------
//  SOCKET IO
// --------------------------------------------------------------------------

let ws = undefined;
let SOCKETS = {};

const stop = (done) => {
    if (undefined === ws){ done(); }
    ws = undefined;
    done();
}

const start = (RED, node, config) => {
    
    // Create the server once
    if (undefined === ws){
        
        SOCKETS = {};
        node.context().global.set("sockets", SOCKETS);

        ws = io.listen(RED.server);
        ws.on('connection', function(socket){
            SOCKETS[socket.id] = socket;
        });
    }

    // Bind for a given path 
    ws.on('connection', function(socket){
        socket.on(config.path, function (data) {
            node.send({ "payload" : data, "socket" : socket.id });
        });
    });
}