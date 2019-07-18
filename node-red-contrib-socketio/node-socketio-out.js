
const helper = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("socketio-out", register, {});
}

const input = (RED, node, data, config) => {
    let SOCKETS = node.context().global.get("sockets");

    let path =  helper.getContextValue(RED, node, data, config.path, config.pathType);
    let value = helper.getContextValue(RED, node, data, config.value, config.valueType);

    if (data.socket){
        SOCKETS[data.socket].emit(path, value);
        return;
    }
    
    for (let id in SOCKETS){
        SOCKETS[id].emit(path, value);
    }
}