
const helper    = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("repeat", register, {});
}

const input = (node, data, config) => {
    let max  = parseInt(config.outputs);
    let out  = new Array(max);
    
    // Retrieve counter
    data._tmp = data._tmp || {}
    let cpt  = data._tmp['rpt_'+node.id] || 0
    if (cpt >= max) return;

    // Set data
    out[cpt] = data;

    // Store counter
    data._tmp['rpt_'+node.id] = cpt + 1;

    // Forward message
    node.send(out);
}
