const request = require('request-promise');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        config.key = RED.nodes.getNode(config.key);
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-video-indexer", register, {});
}

async function input (node, data, config) {
    let key    = config.key,
        action = config.action || "Search",
        body   = config.body,
        object = config.object,
        param  = config.parameters,
        contt  = config.contt;

    if (contt) contt = (config.conttType === "msg") ? contt = helper.getByString(data, contt) : contt;
    if (body)  body =  (config.bodyType  === "msg") ? helper.getByString(data, body) : body;
    else contt = "";

    // Keys
    try {           key = key.key || undefined; }
    catch(err) {    return node.error("ERROR: MS Vision API key is required to get celebrities information."); }

    // Parameters
    let parameters = {};
    for (let obj in param) {
        if (!param[obj].value) continue;
        parameters[obj] = (param[obj].typedInput === 'msg') ? helper.getByString(data, param[obj].value) : param[obj].value;
    }

    // Process
    try {
        let result =  await processReq(key, contt, body, action, object, parameters);
        data.payload = (result) ? JSON.parse(result) : "";
        return node.send(data);
    }
    catch(err) { return node.error(err); }

}

async function processReq( key, contt, body, action, object, parameters) {

    
    let req = {
        uri: 'https://videobreakdown.azure-api.net/Breakdowns/Api/',
        method: 'GET',
        headers: {  
            'Ocp-Apim-Subscription-Key': key
        }
    };

    if (action === "POST" || action === "Upload") req.method = "POST";
    if (action === "PUT") req.method = "PUT";
    if (action === "DELETE") req.method = "DELETE";

    if (contt) req.headers['Content-type'] = contt;
    if (body && (req.method === "POST" || req.method === "PUT")) {
        if (!contt) req.headers['Content-type'] = "application/json";
        if (object === "UpdateTranscript") {
            req.headers['Content-type'] = "plain/text";
            req.body = body;
        }
        else if (object.match(/Brands/)) req.body = body;
        else  req.formData = JSON.parse(body);
    }

    var id = parameters.id || parameters.modelId || parameters.trainingFileId;
        id = (id) ? '/' + id : "";

    delete parameters.id;
    delete parameters.modelId;
    delete parameters.trainingFileId;
    var keys = Object.keys(parameters);

    if      (action === "Upload")   req.uri += "Partner/Breakdowns";
    else if (action === "Search")   req.uri += "Partner/Breakdowns/Search";

    else if (object.match(/TrainingData|TrainingDataGroup|Model/)) req.uri += "Customization/Language/" + object + id;
    else if (object.match(/Brands/)) req.uri += "Customization/Brands" + id;
    else if (object === "ToggleModelActivationState") req.uri += "Customization/Brands/ToggleModelActivationState";
    else if (object === "Breakdowns")     req.uri += (action === "PUT") ? "Partner/Breakdowns/reindex" + id : "Partner/Breakdowns" + id;
    else if (object === "BreakdownsExt")  req.uri += "Partner/Breakdowns/reindexbyexternalid" + id;
    else if (object === "Accounts")       req.uri += "Partner/Accounts";
    else if (object === "GetInsightsWidgetUrlByExternalId")   req.uri += "Partner/Breakdowns/GetInsightsWidgetUrlByExternalId";
    else if (object.match(/UpdateFaceName|UpdateTranscript/)) req.uri += "Partner/Breakdowns/" + object + id ;
    else  req.uri += "Partner/Breakdowns" + id + "/" + object;

    for (let i=0; i<keys.length; i++) {
        req.uri += (i===0) ? '?' : '&';
        req.uri += keys[i] + '=' + encodeURIComponent(parameters[keys[i]]);
    }

    console.log(req)
    return request(req);
}