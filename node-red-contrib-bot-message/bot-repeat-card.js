const helper   = require('node-red-viseo-helper');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("repeat-card", register, {});
}


const input = (node, data, config) => {
    helper.emitAsyncEvent('repeat', node, data, config, (newData) => {
        node.send(newData);
    });
}