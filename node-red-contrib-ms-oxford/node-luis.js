
const helper     = require('node-red-viseo-helper');
const LUISClient = require("./luis");

// https://github.com/Microsoft/Cognitive-LUIS-Node.js
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        
        this.config = RED.nodes.getNode(config.config);

        var node = this;

        try { start(node, config); } catch (ex){ node.warn(ex) }
        this.on('input', (data)  => { try { input(node, data, config) } catch (ex){ node.warn(ex) }});
        this.on('close', (cb)    => { try { stop(node, cb, config) }    catch (ex){ node.warn(ex) }});
    }   
    RED.nodes.registerType("ms-luis", register, {});
}

let LUISclients = {};
const stop  = (node, callback, config) => { 
    LUISclients = {};
    callback(); 
}

const start = (node, config) => {
    if (!config.config){
        return node.status({fill:"red", shape:"ring", text: 'Missing credential'});
    }

    if(LUISclients[node.config.credentials.appId] === undefined) {
        LUISclients[node.config.credentials.appId] = LUISClient({
            appId:  node.config.credentials.appId,
            appKey: node.config.credentials.subKey,
            host: node.config.host,
            verbose: true
        });
    }

    
    node.status({});
}

const input = (node, data, config) => {
    let client = LUISclients[node.config.credentials.appId];

    if (client === undefined) {
        return node.send(data);
    }

    let text = helper.resolve(config.text || '{payload}', data);
    client.predict(text, {

        // On success of prediction
        onSuccess: function (response) {
            helper.setByString(data, config.intent || 'payload', response);
            node.send(data);
        },

        // On failure of prediction
        onFailure: function (err) { node.warn(err); }
    });
}
