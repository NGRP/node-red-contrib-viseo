const botmgr   = require('node-red-viseo-bot-manager');
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
    RED.nodes.registerType("send-custom-message", register, {});

    updateFields = function(opts) {
        if (opts.name) this.name = opts.name;
        return;
    }
}

const input = (node, data, config) => {
    let convId = botmgr.getConvId(data)

    data.customReply = helper.getByString(data, config.content);

    // Prepare the prompt
    if (config.prompt){
        botmgr.delayCallback(convId, (prompt) => {
            data.prompt = prompt
            sendData(node, data, config)
        })
    }

    helper.emitAsyncEvent('reply', node, data, config, (newData) => {
        helper.emitAsyncEvent('replied', node, newData, config, () => {})
        if (config.prompt) { 
            return;
        }
        sendData(node, newData, config);
    });
}


const sendData = (node, data, config) => {
    if (config.prompt && config.promptText) {
        let promptText = helper.resolve(config.promptText, data, undefined);
        config.promptText = promptText;

        if (promptText) { 
            helper.setByString(data, promptText, data.prompt.text, (ex) => { node.warn(ex) });
        }

        helper.emitAsyncEvent('prompt', node, data, config, (data) => {  
            return node.send(data);
        });
    } else {
        return node.send(data);
    }
}