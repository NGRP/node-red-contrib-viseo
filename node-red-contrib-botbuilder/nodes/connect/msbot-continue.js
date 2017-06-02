
const event    = require('../../lib/event.js');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("bot-continue", register, {});
}

const input = (node, data, config) => {
    if (!data._tmp) return;
    
    let callback = data._tmp.event_emitter.callback;
    if (!callback) return;
    
    delete data._tmp.event_emitter;
    callback(data);
}