const fs = require('fs');
const request = require('request');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

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
    RED.nodes.registerType("ms-video-face-track", register, {});
}

const input = (node, data, config) => {

    let req = {
        url: 'https://api.projectoxford.ai/video/v1.0/trackface',
        method: 'POST',
        headers: {'Ocp-Apim-Subscription-Key': config.key }
    }

    let value = helper.getByString(data,config.file);
    if (typeof value !== 'string'){
        req.headers['Content-Type'] = 'application/octet-stream';
        req.body = value;
    } else if (value.indexOf('http') === 0) {
        req.headers['Content-Type'] = 'application/json';
        req.body = JSON.stringify({ 'url' : value });
    } else {
        req.headers['Content-Type'] = 'application/octet-stream';
        req.body = fs.readFileSync(value);
    }

    let cb = (err, response, body) => {
        if (err) return node.send({'payload' : err});
        let json = { faces : JSON.parse(body) };
        extend(true, data, json);
        node.send(data);
    }

    request(req, cb);
}
