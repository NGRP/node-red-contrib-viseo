const request = require('request-promise');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        this.facecreds = RED.nodes.getCredentials(config.facekey);
        if (this.facecreds) node.status({});
        
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("vision-image-faces", register, {});
}

async function input(node, data, config){

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    let facecreds = node.facecreds;
    let facekey, faceregion, visionkey, visionregion;
    let params = config.parameters;
    let action = config.action;
    let api = config.request.split('_');

    // Keys
    try { 
        facekey = facecreds.key;
        faceregion = facecreds.region || "westus";
    }
    catch(err) { 
        return node.error("Missing credentials");
    }

    // Parameters
    let parameters = {};
    let endUrl = api[1];
    for (let par of params) {
        let value = (config[par + 'Type'] === "str") ? config[par] : helper.getByString(data, config[par]);
        if (value) {
            let label = par[0].toLowerCase() + par.substring(1);
            parameters[label] = value;
        }
    }

    endUrl = endUrl.replace(/{faceListId}/, function(a) {
        let value = parameters.faceListId;
        delete parameters.faceListId;
        return value;
    })
    endUrl = endUrl.replace(/{personGroupId}/, function(a) {
        let value = parameters.personGroupId;
        delete parameters.personGroupId;
        return value;
    })
    endUrl = endUrl.replace(/{personId}/, function(a) {
        let value = parameters.personId;
        delete parameters.personId;
        return value;
    })
    endUrl = endUrl.replace(/{persistedFaceId}/, function(a) {
        let value = parameters.persistedFaceId;
        delete parameters.persistedFaceId;
        return value;
    })

    let req = {
        method: api[0].toUpperCase(),
        uri: 'https://' + faceregion + '.api.cognitive.microsoft.com/face/v1.0/' + endUrl,
        headers: { 
            'Ocp-Apim-Subscription-Key': facekey
        }
    }


    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        if (parameters.image) {
            if (typeof parameters.image === 'string') req.body =  JSON.stringify({'url': parameters.image });
            else {
                req.headers['Content-Type'] = 'application/octet-stream';
                req.body = parameters.image;
            }
            delete parameters.image;
            req.uri += buildEndUrl(parameters);
        } 
        else {
            req.json = true;
            req.body = parameters;
        }
    }

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
