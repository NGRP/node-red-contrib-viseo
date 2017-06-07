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
    RED.nodes.registerType("irma-get-human-by-name", register, {});
}

const input = (node, data, config) => {

    let name = helper.getByString(data, config.pname);
    if (name === undefined) name = config.pname;
    if (typeof name !== 'string'){
        data.irma.info = "ERROR : Person name is not a string"
        return node.send(data);
    }

    let group = config.group;

    getNames(config.key, group)
    .then (json => {
        for (let each of json)
        {
            if (each.name === name){ 
                data.irma = data.irma || {};
                data.irma.getHuman = data.irma.getHuman || {};
                data.irma.getHuman = each;
                data.payload = "OK";
                return node.send(data);
            }
        }
        data.payload = "ERROR : Name does not exist";
        return node.send(data);
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}


const getNames = (apiKey, group) => {
    let newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group + "/persons";
    let req = {
        url: newUrl,
        method: 'GET',
        headers: {  
            'Ocp-Apim-Subscription-Key': apiKey
        },
        json: true
    };

    return request(req);
}
