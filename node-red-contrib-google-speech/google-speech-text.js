const fs = require('fs');
const Speech = require('@google-cloud/speech');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        if (!config.key) {node.status({fill:"red", shape:"ring", text: 'Missing credential'}); }
        let key = RED.nodes.getNode(config.key);
        
        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config, key.credentials) });
    }
    RED.nodes.registerType("google-speech-text", register, {});
}

let CLIENTS = {}
const start = (RED, node, config) => {
    CLIENTS = {};
}

const input = (node, data, cfg, credentials) => {
    let client  = getClient(credentials);
    let buffer  = helper.getByString(data, cfg.input || 'payload');
    if (typeof buffer === 'string') { buffer = fs.readFileSync(buffer) }

    let config  = { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'fr-FR' };
    let audio   = { content: buffer.toString('base64') };
    let request = { audio, config };

    client.recognize(request).then((results) => {
        let transcription = results[0].results[0].alternatives[0];
        helper.setByString(data,config.output || 'payload', transcription);
        node.send(data);
    }).catch((err) => { node.warn(err); });
}

const getClient = (credentials) => {
    let client  = CLIENTS[credentials.projectId];
    if (client){ return client; }

    client = Speech({
        projectId: credentials.projectId,
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(/\\n/g,'\n'),
        }
    });

    CLIENTS[credentials.projectId] = client
    return client;
}