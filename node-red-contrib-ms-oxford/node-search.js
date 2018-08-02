const request = require('request-promise');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
//  https://docs.microsoft.com/en-us/azure/cognitive-services/speech/getstarted/getstartedrest
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        this.creds = RED.nodes.getCredentials(config.key);
        if (this.creds) node.status({});

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-cs-search", register, {});
}

async function input (node, data, config) {

    let api = config.api || 'search';
    let params = config.parameters;
    let key = "";

    // Keys
    try { key = node.creds.key; }
    catch(err) { 
        return node.error("Missing credentials");
    }

    // Parameters
    let parameters = {};
    if (config.q) {
        parameters['q'] = (config.qType === "str") ? config.q : helper.getByString(data, config.q);
    }
    for (let par of params) {
        let value = (config[par + 'Type'] === "str") ? config[par] : helper.getByString(data, config[par]);
        if (value) parameters[par] = value;
    }

    // Request
    let req = {
        method: "GET",
        uri: 'https://api.cognitive.microsoft.com/bing/v7.0/' + api + buildEndUrl(parameters),
        headers: { 'Ocp-Apim-Subscription-Key': key }
    }

    node.warn(req)

    request(req)
    .then( function (result) {
        if (typeof result === "string" && (result[0] === '{' || result[0] === '[')) result = JSON.parse(result);
        helper.setByString(data, config.output || "payload", result);
        return node.send(data);
    })
    .catch( function (err) { 
        node.warn(req)
        return node.error(err); 
    });
}

function buildEndUrl(parameters) {
    let url = "";
    let keys = Object.keys(parameters);

    for (let i=0; i<keys.length; i++) {
        if (i===0) url += '?' + keys[0] + '=' + parameters[keys[0]];
        else url += '&' + keys[i] + '=' + parameters[keys[i]];
    }
    return url;
}