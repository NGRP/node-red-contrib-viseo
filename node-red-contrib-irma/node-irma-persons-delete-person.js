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
    RED.nodes.registerType("irma-delete-person", register, {});
}

const input = (node, data, config) => {

    let name = helper.getByString(data, config.pname);
    if (name === undefined) name = config.pname;
    if (typeof name !== 'string'){
        data.payload = "ERROR : Person name is not a string"
        return node.send(data);
    }

    let group = helper.getByString(data, config.group);
    if (group === undefined) group = config.group;
    else if (typeof group !== 'string'){
        data.payload = "ERROR : Group is not a string";
        return node.send(data);
    }

    getNames(config.key, group)
    .then(json => { 
        data.payload = "ERROR : Name does not exist";
        var pid = "";
        for (let each of json)  
        {
            if (each.name === name) pid = each.personId;
        }
        if (pid === "") return node.send(data);
        else {
            delPerson(config.key, pid, group)
            .then( json => {
                data.payload = "OK";
                return node.send(data);
            })
            .catch(err => {
                data.payload = "ERROR : " + err;
                return node.send(data);
            });                   
        }
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}

const delPerson = (apiKey, pid, group) => {
    let newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group + "/persons/" + pid;

    let req = {
        url: newUrl,
        method: 'DELETE',
        headers: {  
            'Ocp-Apim-Subscription-Key': apiKey
        },
        json: true
    }

    return request(req);
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
    }

    return request(req);
}