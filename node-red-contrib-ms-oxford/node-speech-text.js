const request = require('request');
const fs = require('fs');
const extend  = require('extend');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


let stderr = undefined;
module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        stderr = function(data){ node.log(data.toString()); }
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-speech-text", register, {});
}

const input = (node, data, config) => {

    // 1. Get Access Token
    let auth = {
        url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
        method: 'POST',
        headers: {'Ocp-Apim-Subscription-Key': config.key }
    }

    // 2. Send request
    let req = {
        url: 'https://speech.platform.bing.com/recognize',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ', 
            'ContentType': '"audio/wav; codec=""audio/pcm""; samplerate=16000"' 
        },
    }
    req.url += '?scenarios=smd'
            +  '&appid=D4D52672-91D7-4C74-8AD8-42B1D98141A5'
            +  '&locale=fr-FR'
            +  '&device.os=NodeRED'
            +  '&version=3.0'
            +  '&format=json'
            +  '&instanceid='+'b2c95ede-97eb-4c88-81e4-80f32d6aee54'
            +  '&requestid=' +'b2c95ede-97eb-4c88-81e4-80f32d6aee54';
    req.body = fs.readFileSync(data.payload);

    request(auth, (err, response, body) => {
        if (err) return node.error(err);

        req.headers.Authorization += body;
        console.log(req.url)
        request(req, (err, response, body) => {
            if (err) return node.error(err);
            console.log(body)
        });
    });


/*
    if (typeof data.payload !== 'string'){
        req.headers['Content-Type'] = 'application/octet-stream';
        req.body = data.payload;
    } else if (data.payload.indexOf('http') === 0) {
        req.headers['Content-Type'] = 'application/json';
        req.body = JSON.stringify({ 'url' : data.payload });
    } else {
        req.headers['Content-Type'] = 'application/octet-stream';
        req.body = fs.readFileSync(data.payload);
    }

    let cb = (err, response, body) => {
        if (err) return node.send({'payload' : err});
        let json = { faces : JSON.parse(body) };
        extend(true, data, json);
        node.send(data);
    }

    request(req, cb);*/
}
