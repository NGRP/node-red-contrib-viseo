const helper  = require('node-red-viseo-helper');
const botmgr  = require('node-red-viseo-bot-manager');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config) });
        this.on('close', (done)  => { stop(node, config, done) });
    }
    RED.nodes.registerType("bot-wrapper", register, {});
}

const input = (node, data, config) => { 
    data = botmgr.buildMessageFlow(data, config)

    // Handle Prompt
    let convId  = botmgr.getConvId(data)
    if (botmgr.hasDelayedCallback(convId, data.message)) return;

    // Trigger received message
    helper.emitEvent('received', node, data, config);
    node.send([data, undefined]);
}


let LISTENERS = {};
const start = (RED, node, config) => {  
    let listener = LISTENERS[node.id] = (srcNode, data, srcConfig) => { reply(node, data, config) }
    helper.listenEvent('reply', listener)
}

const stop = (node, config, done) => {
    let listener = LISTENERS[node.id]
    helper.removeListener('reply', listener)
    done();
}

const reply = (node, data, config) => { 

    // Assume we send the message to the current user address
    let address = botmgr.getUserAddress(data)
    if (!address || address.carrier !== config.source) return false;

    // Building the message
    let message = data.reply;
    if (!message) return false;

    // Set the user address to the message
    message.address = address
    node.send([undefined, data]);

    // Let <continue> node to perform that
    // helper.fireAsyncCallback(data);
}