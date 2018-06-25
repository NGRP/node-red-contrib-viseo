const fs = require('fs');
const request = require('request');
const extend  = require('extend');
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
        config.key = RED.nodes.getCredentials(config.key);
        if (config.key && config.key.key) node.status({});

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-speech-text", register, {});
}

const input = (node, data, config) => {
    
    // 1. Get Access Token
    let auth = {
        url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
        method: 'POST',
        headers: {'Ocp-Apim-Subscription-Key': config.key.key }
    }

    // 2. Send request
    let URI = 'https://speech.platform.bing.com/speech/recognition/interactive/cognitiveservices/v1?'
    let QS  = 'language='+(config.language || 'fr-FR')+'&format=simple&requestid=node-red-viseo'
    let req  = { 
        url: URI + QS,
        method: 'POST',
        headers: { 'Authorization': 'Bearer ', 'Transfer-Encoding': 'chunked'  },
    }
    req.headers['ContentType'] = config.contentType || 'audio/wav; codec="audio/pcm"; samplerate=16000'

    // Retrieve Buffer
    req.body = helper.getByString(data,config.input || 'payload');
    if (typeof req.body === 'string') { req.body = fs.readFileSync(req.body) }

    request(auth, (err, response, body) => {
        if (err) return node.error(err);
        req.headers.Authorization += body;

        request(req, (err, response, body) => {
            if (err) return node.error(err);
            try {
                let json = JSON.parse(body)
                helper.setByString(data,config.output || 'payload', json);
                node.send(data);
            } catch(ex){ node.warn('JSON Parse Exception: ' + body) }
        });
    });
}
