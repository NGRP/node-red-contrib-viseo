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
    RED.nodes.registerType("irma-add-face", register, {});
}

const input = (node, data, config) => {

    let image = helper.getByString(data, config.image);
    if (typeof image !== 'object'){
        data.payload = "ERROR : Image is not an buffer";
        return node.send(data);
    }
    let person = helper.getByString(data, config.person);
    if (typeof person !== 'object'){
        data.payload = "ERROR : Person is not an object";
        return node.send(data);
    }
    let group = config.group;
    if (typeof group !== 'string'){
        data.payload = "ERROR : Group Id is not a string";
        return node.send(data);
    }
    if (person.persId === 'unknown' || typeof person.persId !== 'string'){
        data.payload = "ERROR : Unknown person";
        return node.send(data);
    }

    addPicture(config.key, image, person, group)
    .then (json => {
        trainModel(config.key, group)
        .then (json => {
            data.payload = "OK";
            return node.send(data); })
        .catch (err => {
            data.payload = "ERROR : " + err;
            return node.send(data); })
    })
    .catch (err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}

const addPicture = (apiKey, image, person, group) => {
    var newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group + "/persons/" + person.persId + "/persistedFaces?targetFace=" +  
                 person.faceRectangle.left + "," + person.faceRectangle.top + "," + person.faceRectangle.width + "," + person.faceRectangle.height ;

    let req = {
        url: newUrl,
        method: 'POST',
        body: image,
        headers: {  
            'Content-type' : 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': apiKey
        }
    };

    return request(req);
}

const trainModel = (apiKey, group) => {
    let newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group + "/train";

    let req = {
        url: newUrl,
        method: 'POST',
        headers: {  
            'Ocp-Apim-Subscription-Key': apiKey
        },
        json: true
    };

    return request(req);
}