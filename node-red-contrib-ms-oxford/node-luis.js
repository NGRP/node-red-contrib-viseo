const request =    require('request-promise');
const helper     = require('node-red-viseo-helper');

// https://github.com/Microsoft/Cognitive-LUIS-Node.js
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        
        this.config = RED.nodes.getNode(config.config);
        var node = this;
        this.on('input', (data)  => { try { input(node, data, config) } catch (ex){ node.warn(ex) }});
    }   
    RED.nodes.registerType("ms-luis", register, {});
}


async function input(node, data, config) {
    
    if (!config.config){
        return node.status({fill:"red", shape:"ring", text: 'Missing credential'});
    }

    // Get parameters
    let way = node.config.way || "key";
    let cred = node.config.credentials;  
    let text = config.text || "payload";
    let output = config.intent || "payload";

    // Credentials
    if (way === "key" && (!cred.appId || !cred.subKey)) {
        return node.status({fill:"red", shape:"ring", text: 'Missing credential'});
    }
    else if (way === "endpoint" && !cred.endpoint) {
        return node.status({fill:"red", shape:"ring", text: 'Missing credential'});
    }

    let host = node.config.host.replace(/^https?:\/\//ig, '') || "";
        host = "https://" + host.replace(/^www/ig, '');
        host = host.replace(/\/$/ig, '');


    // Input
    if (config.textType !== 'str') {
        let loc = (config.textType === 'global') ? node.context().global : data;
        text = helper.getByString(loc, text);
    }

    // Process
    let url = (way === "key") ? host + "/luis/v2.0/apps/" + cred.appId + "?subscription-key=" + cred.subKey + "&q="  : cred.endpoint;

    try {
        let response = await request({
            uri: url + encodeURIComponent(text),
            method: 'GET'
        });

        let outLoc = (config.intentType === 'global') ? node.context().global : data;
        helper.setByString(outLoc, output, JSON.parse(response));
        return node.send(data);
    }
    catch(err) { 
        return node.error(err);
    }
}
