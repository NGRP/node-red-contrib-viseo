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
    RED.nodes.registerType("irma-reset-group", register, {});
}

const input = (node, data, config) => {

    let group = helper.getByString(data, config.group);
    if (group === undefined) group = config.group;
    else if (typeof group !== 'string'){
        data.payload = "ERROR : Group is not a string";
        return node.send(data);
    }

    delGroup(config.key, group)
    .then( json =>      createGroup(config.key, group))
    .then( json => {    data.payload = "OK";
                        return node.send(data);  })
    .catch( err => {    data.payload = "ERROR : " + err;
                        return node.error(err); });
}

const delGroup = (apiKey, group) => {
    let newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group;

    let req = {
        url: newUrl,
        method: 'DELETE',
        headers: {  
            'Ocp-Apim-Subscription-Key': apiKey
        },
        json: true
    };

    return request(req);
}

const createGroup = (apiKey, group) => {
    let newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group;

    let req = {
        url: newUrl,
        method: 'PUT',
        body: JSON.stringify({
            name: group,
            userData: ''
        }),
        headers: {  
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey
        }
    };

    return request(req);
}
