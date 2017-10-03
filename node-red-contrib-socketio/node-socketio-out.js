
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

    let path = config.path,
        value = config.value;

    if (config.pathType !== 'str') {
        let loc = (config.pathType === 'global') ? node.context().global : data;
        path = helper.getByString(loc, path);
    }
    if (config.valueType !== 'str') {
        let loc = (config.valueType === 'global') ? node.context().global : data;
        value = helper.getByString(loc, value);
    }

    if (data.socket){
        SOCKETS[data.socket].emit(path, value);
        return;
    }
    
    for (let id in SOCKETS){
        SOCKETS[id].emit(path, value);
    }
}