const botmgr   = require('node-red-viseo-bot-manager');
const helper   = require('node-red-viseo-helper');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(RED, node, data, config, null)  });
    }
    RED.nodes.registerType("node-dialogflow-handoff", register, {});
}

const input = (RED, node, data, config) => {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }
    
    let convId = botmgr.getConvId(data);
    let reqCapabilities = helper.getContextValue(RED, node, data, config.capab, config.capabType || 'json');
    let capabilities = [];
    try {
        let capabList = data.message.available.surfaces.list[0].capabilities.list;
        for (let capab of capabList) capabilities.push(capab.name);
    }
    catch(err) {
        data[config.output || "payload"] = "Missing capabilities information";
        node.send([undefined, data]);
    }

    for (let capab of reqCapabilities) {
        if (capabilities.indexOf(capab) === -1) {
            data[config.output || "payload"] = `Missing ${capab} capability`;
            node.send([undefined, data]);
        }
    }
    

    // Prepare the prompt
    botmgr.delayCallback(convId, (prompt) => {
        data.prompt = prompt;
        sendData(node, data, config)
    })


    // Retrieve replies
    let reply = {
        "type"      : "handoff",
        "prompt"    : true,
        "receipt"   : data._receipt
    };

    delete data._receipt;
    reply.reason = helper.getContextValue(RED, node, data, config.reason, config.reasonType || 'str');
    reply.notif = helper.getContextValue(RED, node, data, config.notif, config.notifType || 'str');
    reply.capab = reqCapabilities;

    
    // Emit reply message
    data.reply = [reply];
    data._replyid = node.id;

    helper.emitAsyncEvent('reply', node, data, config, (newData) => {
        helper.emitAsyncEvent('replied', node, newData, config, () => {})
    });
}

const sendData = (node, data, config) => {

    let out  = new Array(2);
    let promptText = undefined;

    if (config.promptText) {
        promptText = helper.resolve(config.promptText, data, undefined);
    }

    let _continue = (data) => {
        let args = data.prompt.arguments;
        let status = false;
        if (args && args.parsed && args.parsed.input && args.parsed.input.NEW_SURFACE) {
            status = args.parsed.input.NEW_SURFACE.status;
        }
        if (status === "OK") out[0] = data;
        else {
            data[config.output || "payload"] = "refused";
            out[1] = data;
        }
        return node.send(out);
    }

    config.promptText = promptText;
    helper.setByString(data, promptText || "prompt.text", data.prompt.text, (ex) => { node.warn(ex) });
    helper.emitAsyncEvent('prompt', node, data, config, (data) => {  
        _continue(data); 
    });
}   