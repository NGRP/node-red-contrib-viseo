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
    RED.nodes.registerType("ms-vision-face-detect", register, {});
}

const input = (node, data, config) => {

    let req = {
        url: 'https://api.projectoxford.ai/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false',
        method: 'POST',
        headers: {'Ocp-Apim-Subscription-Key': config.key }
    }

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

    request(req, cb);
}
