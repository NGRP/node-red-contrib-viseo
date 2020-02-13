
const helper =  require('node-red-viseo-helper');
const request = require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.status({fill:"red", shape:"ring", text: 'Missing credential'})
        if (config.auth) {
            node.auth = RED.nodes.getNode(config.auth);
            node.status({});
        }

        this.on('input', (data)  => { input(RED, node, data, config,) });
    }
    RED.nodes.registerType("google-actions", register, {});
}

function input (RED, node, data, config) {
    // action
    let action = config.action;
      
    try {
        node.auth.authenticate((auth) => {
            if (auth) {
                if (action === 'token') {
                    helper.setByString(data, config.output || "payload", auth.credentials);
                    return node.send(data);
                }
            }
            return node.send(data);
        })
    } catch (ex){ console.log(ex); }
}
