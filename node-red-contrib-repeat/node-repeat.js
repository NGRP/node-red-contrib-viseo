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
 
let COUNTER = 0;
const input = (node, data, config) => {

    const repeatKey = 'rpt_' + node.id.replace('.', '_');

    let max   = parseInt(config.outputs);
    let out   = new Array(max);
    let scope = config.scope || 'msg';
 
    // 1. Scope: Global
    if (scope === 'global') {
 
        // Increment counter
        COUNTER = (COUNTER >= max) ? 1 : COUNTER+1;

        // Set data
        out[COUNTER-1] = data;
        return node.send(out);
    }
     
    // 2. Scope flow
    let _tmp = data._tmp = data._tmp || {};
 
    // 3. Scope User
    if (scope === 'user'){
        data.user = data.user || {};
        _tmp = data.user._tmp = data.user._tmp ||{};
    } 

    // Get value
    let cpt = _tmp[repeatKey] || 0;
 
    // Default behavior
    if (cpt < max) {
        out[cpt] = data;
        _tmp[repeatKey] = cpt + 1;
        return node.send(out);
    }
 
    // No reset
    if (!config.reset) return;
 
    // Reset to last or first
    cpt = (config.reset === 'last') ? max-1 : 0;

    _tmp[repeatKey] = cpt;
    out[cpt] = data;
    return node.send(out);
}