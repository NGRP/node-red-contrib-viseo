
var io = require('socket.io');
const helper = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        start(RED, node, config);
        this.on('close', (done) => { stop(done) });
    }
    RED.nodes.registerType("socketio-in", register, {});
}

// --------------------------------------------------------------------------
//  SOCKET IO
// --------------------------------------------------------------------------

let ws = undefined;
let SOCKETS = {};

const stop = (done) => {
    if (ws === undefined) done(); 
    ws = undefined;
    done();
}

const start = (RED, node, config) => {
    
    // Create the server once
    if (ws === undefined){
        SOCKETS = {};
        node.context().global.set("sockets", SOCKETS);

        ws = io.listen(RED.server);
        ws.on('connection', function(socket){
            SOCKETS[socket.id] = socket;
        });
    }

    // Bind for a given path 
    ws.on('connection', function(socket){

        let path = config.path;
        if (config.pathType !== 'str') {
            path = helper.getByString(node.context().global, path);
        }
        
        socket.on(path, function (data) {
            let result = { "socket" : socket.id };
            let output = config.output || "payload";
            result[output] = data;
            node.send(result);
        });
    });
}