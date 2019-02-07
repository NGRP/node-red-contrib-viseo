const request =    require('request-promise');
const helper     = require('node-red-viseo-helper');

// https://github.com/Microsoft/Cognitive-LUIS-Node.js
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        let conf = RED.nodes.getNode(config.config);
        node.status({fill:"red", shape:"ring", text: 'Missing credentials'});
        
        if (!conf || !conf.credentials) return;
        if (conf.way === "key") {
            this.endpoint  = "https://" + (conf.location || "westus") + ".api.cognitive.microsoft.com/luis/v2.0/apps/" + conf.credentials.appId;
            this.endpoint += "?subscription-key=" + conf.credentials.subKey + (conf.verbose ? "&verbose=" + conf.verbose : "") 
            this.endpoint += (conf.staging ? "&staging=" + conf.staging : "") + "&q=";
        }
        else this.endpoint = conf.credentials.endpoint;

        if (this.endpoint) node.status({});
        this.on('input', (data)  => { try { input(node, data, config) } catch (ex){ node.warn(ex) }});
    }
    RED.nodes.registerType("ms-luis", register, {});
}


async function input(node, data, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // Get parameters
    let url = node.endpoint;  
    let text  = config.text || "payload";
    let output = config.intent || "payload";

    // Input
    if (config.textType !== 'str') {
        let loc = (config.textType === 'global') ? node.context().global : data;
        text = helper.getByString(loc, text);
    }

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
