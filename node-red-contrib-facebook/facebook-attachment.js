const helper  = require('node-red-viseo-helper');
const rp = require('request-promise');
const fs = require('fs');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        node.pageToken = RED.nodes.getCredentials(config.pageToken);
        if (node.pageToken && node.pageToken.token) node.status({});

        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("facebook-attachment", register, {});
}

async function input (RED, node, data, config) {

    let token = node.pageToken.token;
    if (!token) return node.warn("Missing information");
    

    let message = {
        "attachment":{
            "type": config.content,
            "payload": {
                "is_reusable": true
            }
        }
    }

    let source = helper.getContextValue(RED, node, data, config.attachment, config.attachmentType || 'str');
    let result;

    try {
        if (config.source === "url") {
            message.attachment.payload.url = source;
            result = await postFromURL(token, message);
        }
        else {
            let contentType = helper.getContextValue(RED, node, data, config.contentType, config.contentTypeType || 'str');
            result = await uploadFromFile(token, message, source, contentType);
            result = JSON.parse(result);
        }
    }
    catch(err) {
        console.log(err)
        result = { "error" : err };
    }
   
    helper.setByString(data, config.output || "payload", result);
    node.send(data); 
    
}

// --------------------------------------------------------------------------
//  FACEBOOK API
// --------------------------------------------------------------------------

const URL = "https://graph.facebook.com/v2.6";
const QS  = "/me/message_attachments";

async function postFromURL(token, message) {
    let url = `${URL}${QS}?access_token=${token}`;
    let request = {
        method: "POST",
        uri: url,
        body: { "message": message },
        json: true
    }

    return rp(request);
}

async function uploadFromFile(token, message, source, contentType) {
    let url = `${URL}${QS}?access_token=${token}`;
    let request = {
        method: "POST",
        uri: url,
        formData: { 
            "message": JSON.stringify(message),
            "filedata":fs.createReadStream(source),
            "type": contentType
        }
    }

    return rp(request);
}