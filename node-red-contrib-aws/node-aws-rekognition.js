const helper  = require('node-red-viseo-helper');
const AWS = require('aws-sdk');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        if (config.key) {
            config.creds = RED.nodes.getCredentials(config.key);
            node.status({});
        }
        
        start(node, config, RED);
        this.on('input', (data) => { input(node, config, data)  });
        this.on('close', (done) => { stop(node, config, done) });
    }
    RED.nodes.registerType("aws-rekognition", register, {});
}

let _AWS = {};

function start(node, config, RED) {
    if (!config.key   || _AWS[config.key]) return;
    if (!config.creds || !config.creds.accessKeyId || !config.creds.secretAccessKey) return;
    _AWS[config.key] = new AWS.Rekognition(config.creds);
}

function input(node, config, data){

    let rekognition = _AWS[config.key];
    if (!rekognition) {
        helper.setByString(data, config.output || "payload" , { error: "Missing credentials" });
        node.warn("AWS Lex: Error - Missing credentials");
        return node.send(data);
    }

    config.creds.region = config.creds.region || "us-east-1";
    let action = config.action || "DetectFaces";
    let parameters = {};

    for (let par of config.parameters) {
        let value = config[par];
        if (config[par + 'Type'] === "json") value = JSON.parse(value);
        else if (config[par + 'Type'] === "msg") value = helper.getByString(data, value);
        if (value) parameters[par] = value;
    }

    action = action[0].toLowerCase() + action.substring(1);
    rekognition[action](params = parameters, function (err, res) {
        if (err) {
            helper.setByString(data, config.output || "payload" , { error: err });
            node.warn("AWS Lex: Error - postText - " + err);
            return node.send(data);
        }
        helper.setByString(data, config.output || "payload" , res);
        return node.send(data);
    });
}

function stop(node, config, done) {
    if (_AWS[config.key]) delete _AWS[config.key];
    done();
}
