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

        node.status({fill:"red", shape:"ring", text: 'Missing credential'})
        if (config.auth) {
            node.auth = RED.nodes.getNode(config.auth);
            node.status({});
        }

        this.on('input', (data)  => { input(node, data, config) });
    }
    RED.nodes.registerType("google-speech-text", register, {});
}

const input = (node, data, config) => {
    node.client = Speech(node.auth.cred);

    let buffer  = helper.getByString(data, config.input || 'payload');
    if (typeof buffer === 'string') { buffer = fs.readFileSync(buffer) }

    let cfg     = { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: (config.language || 'fr-FR') };
    let audio   = { content: buffer.toString('base64') };
    let request = { audio, 'config': cfg };

    node.client.recognize(request).then((results) => {
        let transcription = results[0].results[0].alternatives[0];
        helper.setByString(data, config.output || 'payload', transcription);
        node.send(data);
    }).catch((err) => { node.warn(err); });
}
