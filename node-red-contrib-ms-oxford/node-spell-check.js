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

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-spell-check", register, {});
}

const input = (node, data, config) => {

    let input = config.input || "payload",
        output = config.output || "payload",
        api = config.api || "get",
        endpoint = config.endpoint || "https://api.cognitive.microsoft.com/bing/v7.0/spellcheck", 
        outputLoc = (config.outputType === 'global') ? node.context().global : data;

    // 0. Errors handling
    if (!config.creds || !config.creds.key) {
        return node.error("Missing key");
    }

    // 1. Get fields
    if (config.inputType  !== 'str') {
        let loc = (config.inputType === 'global') ? node.context().global : data;
        input = helper.getByString(loc, input);
    }

    if (config.endpointType !== 'str') {
        let loc = (config.endpointType === 'global') ? node.context().global : data;
        endpoint = helper.getByString(loc, endpoint);
    }
    endpoint = endpoint.replace(/\/$/, '');

    // 2. Get parameters
    let mkt = config.mkt || "en-us" ,
        mode = config.mode || "proof",
        preContextText = config.preContextText,
        postContextText = config.postContextText;

    if (config.mktType  !== 'str') {
        let loc = (config.mktType === 'global') ? node.context().global : data;
        mkt = helper.getByString(loc, mkt);
    }
    if (preContextText && config.preContextTextType  !== 'str') {
        let loc = (config.preContextTextType === 'global') ? node.context().global : data;
        preContextText = helper.getByString(loc, preContextText);
    }
    if (postContextText && config.postContextTextType  !== 'str') {
        let loc = (config.postContextTextType === 'global') ? node.context().global : data;
        postContextText = helper.getByString(loc, postContextText);
    }


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
        helper.setByString(outputLoc, output, JSON.parse(body));
        return node.send(data);
    });
}
