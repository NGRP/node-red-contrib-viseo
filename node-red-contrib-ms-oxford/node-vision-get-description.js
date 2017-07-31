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
        this.visionkey = RED.nodes.getNode(config.visionkey);
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("vision-get-description", register, {});
}

const input = (node, data, config) => {

    let key = node.visionkey.key;
    let image = config.image;
    let imagetype = config.imagetype;

    if (imagetype === "type-attach" || imagetype === "type-buffer"){
        image = helper.getByString(data, image  || 'message.attachments[0].contentUrl');
    }

    getImage(data, image, imagetype)
    .then (json => {

        if (imagetype !== "type-buffer") image = json;
        getDescription(key, image)
        .then (json => {
            let jay = JSON.parse(json);
            data.payload = jay.description.captions[0].text;
            return node.send(data);
        })
        .catch(err => {
            data.payload = "ERROR : " + err;
            return node.send(data);
        })
    })
    .catch(err => {
    data.payload = "ERROR : " + err;
    return node.error(data);
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

const getImage = (data,image, type) => {
    if (type === "type-buffer") { 
        return new Promise( (resolve, reject) => {
            if (image !== null) {
                resolve(image);
            } else { 
                reject("The buffer is empty");   }
        });
    } else {
        let req = {
            encoding: null,
            url: image,
            method: 'GET'
        };
        return request(req);
    }
}
