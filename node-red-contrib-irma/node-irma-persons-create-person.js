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
    RED.nodes.registerType("irma-create-person", register, {});
}

const input = (node, data, config) => {

    let person = helper.getByString(data, config.person);
    if (typeof person !== 'object'){
        data.payload = "ERROR : Person is not an object";
        console.log(person);
        return node.send(data);
    }
    let name = helper.getByString(data, config.pname);
    if (name === undefined) name = config.pname;
    if (typeof name !== 'string'){
        data.payload = "ERROR : Person name is not a string";
        return node.send(data);
    }
    let group = config.group;
    if (typeof group !== 'string'){
        data.payload = "ERROR : Group Id is not a string";
        return node.send(data);
    }
    if (person.name !== "unknown"){
        data.payload = "ERROR : The name should be 'unknown'";
        return node.send(data);
    }
    if (name === ""){
       data.payload = "ERROR : The name is empty";
        return node.send(data);
    }

    getNames(config.key, group)
    .then (json => {
        for (let each of json)
        {
            if (each.name === name){ 
                data.payload = "ERROR : Name already exists";
                return node.send(data);
            }
        } 
        createPerson(config.key, person, group, name)
        .then (json => {
            data.payload = "OK";
            helper.setByString(data,config.person + ".persId",json.personId)
            helper.setByString(data,config.person + ".name",name)
            return node.send(data);
        })
        .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
        });
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}


const createPerson = (apiKey, person, group, pname) => {
    var newUrl = "https://westus.api.cognitive.microsoft.com/face/v1.0/persongroups/" + group + "/persons";
    let req = {
        method: 'POST',
        uri: newUrl,
        headers: {  
            'Content-type' : 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey
        },
        body: {
            'name': pname,
            'userData' : 'facesArray'
        },
        json: true
    };

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
    };

    return request(req);
}
