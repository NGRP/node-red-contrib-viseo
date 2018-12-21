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
    RED.nodes.registerType("ms-content-moderator", register, {});
}

const input = (node, data, config) => {

    let input = config.input || "payload",
        output = config.output || "payload",
        api = config.api || "ProcessText",
        process = config.processType,
        endpoint = config.endpoint || "https://westeurope.api.cognitive.microsoft.com/contentmoderator",
        content = config.content || "application/json",
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

    let req = {
        uri: endpoint + '/moderate/v1.0/' + process + '/' + api,
        method: "POST",
        headers: {
            'Ocp-Apim-Subscription-Key': config.creds.key
        }
    }

    // 2. Get parameters
    if (process === "ProcessImage") {
        if (config.CacheImageType  !== 'bool') {
            let loc = (config.CacheImageType === 'global') ? node.context().global : data;
            req.uri += "?CacheImage=" + helper.getByString(loc, config.CacheImage);
        }
        else req.uri += "?CacheImage" + config.CacheImage;

        if (api === "Match") {
            if (config.listIdType  !== 'str') {
                let loc = (config.listIdType === 'global') ? node.context().global : data;
                req.uri += "&listId=" + helper.getByString(loc, config.listId);
            }
            else req.uri += "&listId=" + config.listId
        }
        else if (api === "OCR") {
            if (config.languageType  !== 'str') {
                let loc = (config.languageType === 'global') ? node.context().global : data;
                req.uri += "&language=" + helper.getByString(loc, config.language);
            }
            else req.uri += "&language=" + config.language
            if (config.enhancedType  !== 'bool') {
                let loc = (config.enhancedType === 'global') ? node.context().global : data;
                req.uri += "&enhanced=" + helper.getByString(loc, config.enhanced);
            }
            else req.uri += "&enhanced=" + config.enhanced
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
            if (config.listIdType  !== 'str') {
                let loc = (config.listIdType === 'global') ? node.context().global : data;
                req.uri += "?listId=" + helper.getByString(loc, config.listId);
            }
            else req.uri += "?listId=" + config.listId;

            if (config.languageType  !== 'str') {
                let loc = (config.languageType === 'global') ? node.context().global : data;
                req.uri += "&language=" + helper.getByString(loc, config.language);
            }
            else req.uri += "&language=" + config.language;
            if (config.autocorrectType  !== 'bool') {
                let loc = (config.autocorrectType === 'global') ? node.context().global : data;
                req.uri += "&autocorrect=" + helper.getByString(loc, config.autocorrect);
            }
            else req.uri += "&autocorrect=" + config.autocorrect;
            if (config.PIIType  !== 'bool') {
                let loc = (config.PIIType === 'global') ? node.context().global : data;
                req.uri += "&PII=" + helper.getByString(loc, config.PII);
            }
            else req.uri += "&PII=" + config.PII;
            if (config.classifyType  !== 'bool') {
                let loc = (config.classifyType === 'global') ? node.context().global : data;
                req.uri += "&classify=" + helper.getByString(loc, config.classify);
            }
            else req.uri += "&classify=" + config.classify;
        }

        req.headers["Content-Type"] = "text/plain"
        req.body = input;
    }

    console.log(req)
    // 2. Send request
    request(req, (err, response, body) => {
        if (err) return node.error(err);
        helper.setByString(outputLoc, output, (typeof body === "object") ? body : JSON.parse(body));
        return node.send(data);
    });
}
