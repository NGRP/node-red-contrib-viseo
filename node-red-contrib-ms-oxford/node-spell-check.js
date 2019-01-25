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
    RED.nodes.registerType("ms-spell-check", register, {});
}

const input = (RED, node, data, config) => {

    let input = config.input || "payload",
        output = config.output || "payload",
        api = config.api || "get",
        endpoint = config.endpoint || "https://api.cognitive.microsoft.com/bing/v7.0/spellcheck";

    // 0. Errors handling
    if (!config.creds || !config.creds.key) {
        return node.error("Missing key");
    }

    // 1. Get fields

    let input = helper.getContextValue(RED, node, data, config.input || "payload", config.inputType);
    
    endpoint = helper.getContextValue(RED, node, data, endpoint, config.endpointType);
    endpoint = endpoint.replace(/\/$/, '');

    // 2. Get parameters

    let mkt = helper.getContextValue(RED, node, data, config.mkt || "en-us", config.mktType);
    let preContextText = helper.getContextValue(RED, node, data, config.preContextText, config.preContextTextType);
    let postContextText = helper.getContextValue(RED, node, data, config.postContextText, config.postContextTextType);
    let mode = config.mode || "proof";

    let req = {
        url: endpoint,
        method: api.toUpperCase(),
        headers: {
            'Ocp-Apim-Subscription-Key': config.creds.key
        }
    }

    if (api === "get") {
        req.url += "?text=" + input + "&mode=" + mode + "&mkt=" + mkt;
        if (preContextText)  req.url += "&preContextText=" + preContextText;
        if (postContextText) req.url += "&postContextText=" + postContextText;
    }
    else {
        req.form = { "text" : input };
        req.url += "?mode=" + mode + "&mkt=" + mkt;
    }

    // 2. Send request
    request(req, (err, response, body) => {
        if (err) return node.error(err);
        helper.setByString(data, output, JSON.parse(body));
        return node.send(data);
    });
}
