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
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("irma-get-description", register, {});
}

const input = (node, data, config) => {

    let image = helper.getByString(data, config.image);
    if (typeof image !== 'object'){
        data.payload = "ERROR : Image is not an buffer";
        return node.send(data);
    }

    getDescription(config.key, image)
    .then (json => {
        let jay = JSON.parse(json);
        data.payload = jay.description.captions[0].text;
        return node.send(data);
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}

const getDescription = (apiKey, image) => {
    let req = {
        url: 'https://westus.api.cognitive.microsoft.com/vision/v1.0/analyze?visualFeatures=Description&language=en',
        method: 'POST',
        body: image,
        headers: {  
            'Content-type' : 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': apiKey
        }
    };

    return request(req);
}