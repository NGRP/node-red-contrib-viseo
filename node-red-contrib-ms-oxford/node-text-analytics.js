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

        config.creds = RED.nodes.getCredentials(config.key);
        if (config.creds && config.creds.key) node.status({});

        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("ms-text-analytics", register, {});
}

const input = (RED, node, data, config) => {

    let output = config.output || "payload",
        api = config.api || "keyPhrases",
        endpoint = config.endpoint || "https://westeurope.api.cognitive.microsoft.com/text/analytics/v2.0", 

    // 0. Errors handling
    if (!config.creds || !config.creds.key) {
        return node.error("Missing key");
    }

    // 1. Get fields
    let input = helper.getContextValue(RED, node, data, config.input || "payload", config.inputType);
    
    endpoint = helper.getContextValue(RED, node, data, endpoint, config.endpointType);
    endpoint = endpoint.replace(/\/$/, '');

    let req = {
        url: endpoint + '/' + api,
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': config.creds.key
        },
        body: input,
        json: true
    }

    // 2. Send request
    request(req, (err, response, body) => {
        if (err) return node.error(err);
        helper.setByString(data, output, body);
        return node.send(data);
    });
}
