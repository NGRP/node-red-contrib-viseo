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
    RED.nodes.registerType("ms-content-moderator", register, {});
}

const input = (RED, node, data, config) => {

    let output = config.output || "payload",
        api = config.api || "ProcessText",
        process = config.processType,
        endpoint = config.endpoint || "https://westeurope.api.cognitive.microsoft.com/contentmoderator",
        content = config.content || "application/json",
        input = helper.getContextValue(RED, node, data, config.input || "payload", config.inputType);

    // 0. Errors handling
    if (!config.creds || !config.creds.key) return node.error("Missing key");

    endpoint = helper.getContextValue(RED, node, data, endpoint, config.endpointType);
    endpoint = endpoint.replace(/\/$/, '');

    let req = {
        uri: endpoint + '/moderate/v1.0/' + process + '/' + api,
        method: "POST",
        headers: {
            'Ocp-Apim-Subscription-Key': config.creds.key
        }
    }

    // 2. Get parameters
    if (process === "ProcessImage") {
        req.uri += "?CacheImage" + helper.getContextValue(RED, node, data, config.CacheImage, config.CacheImageType);

        if (api === "Match") {
            req.uri += "&listId=" + helper.getContextValue(RED, node, data, config.listId, config.listIdType);
        }
        else if (api === "OCR") {
            req.uri += "&language=" + helper.getContextValue(RED, node, data, config.language, config.languageType);
            req.uri += "&enhanced=" + helper.getContextValue(RED, node, data, config.enhanced, config.enhancedType);
        }

        if (content === "application/json") {
            req.body = { "DataRepresentation":"URL", "Value": input },
            req.json = true;
        }
        else {
            req.headers["Content-Type"] = content;
            req.body = input;
        }
    } 
    else {
        if (api === "Screen") {
            req.uri += "?listId=" + helper.getContextValue(RED, node, data, config.listId, config.listIdType);
            req.uri += "&language=" + helper.getContextValue(RED, node, data, config.language, config.languageType);
            req.uri += "&autocorrect=" + helper.getContextValue(RED, node, data, config.autocorrect, config.autocorrectType);
            req.uri += "&PII=" + helper.getContextValue(RED, node, data, config.PII, config.PIIType);
            req.uri += "&classify=" + helper.getContextValue(RED, node, data, config.classify, config.classifyType);
        }

        req.headers["Content-Type"] = "text/plain"
        req.body = input;
    }

    console.log(req)
    // 2. Send request
    request(req, (err, response, body) => {
        if (err) return node.error(err);
        helper.setByString(data, output, (typeof body === "object") ? body : JSON.parse(body));
        return node.send(data);
    });
}
