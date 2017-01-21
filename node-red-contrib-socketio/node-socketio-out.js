
const io     = require('socket.io');
const helper = require('node-red-viseo-helper');

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
    let SOCKETS = node.context().global.get("sockets");
    let payload = helper.getByString(data, config.value);

    if (data.socket){
        SOCKETS[data.socket].emit(config.path, payload);
        return;
    }
    
    for (let id in SOCKETS){
        SOCKETS[id].emit(config.path, payload);
    }
}