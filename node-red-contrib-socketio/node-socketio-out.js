
var io = require('socket.io');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("socketio-out", register, {});
}

const input = (node, data, config) => {

    if (data.socket){
        data.socket.emit(config.path, data.payload);
        return;
    }
    
    let SOCKETS = node.context().global.get("sockets");
    for (let id in SOCKETS){
        SOCKETS[id].emit(config.path, data.payload);
    }
}
