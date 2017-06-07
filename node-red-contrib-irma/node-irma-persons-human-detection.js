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
    RED.nodes.registerType("irma-human-detection", register, {});
}

const input = (node, data, config) => {

    let value = helper.getByString(data, config.image || 'payload');
    if (typeof value !== 'object'){
        data.payload = "ERROR : Image is not a buffer";
        return node.send(data);
    }

    getHumans(config.key, value)
    .then( json => {
        let humans = JSON.parse(json);
        let nbHumans = humans.length;

        if (nbHumans === 0) 
        {
            let json = { irma: {nbPersons : 0} };
            extend(true, data, json);
            return node.send(data);
        }
        else {
            let facesArray = [];
            for (let human of humans) facesArray.push(human.faceId);

            identifyPersons(config.key, config.group, facesArray)
            .then( jayson => {

                var personArray = [],
                    newName = '',
                    step = 0;

                for (step=0; step < nbHumans; step++)
                {
                    if (jayson === undefined || jayson[step] === undefined || jayson.length === 0) newName = 'unknown';
                    else if (jayson[step].candidates === undefined || jayson[step].candidates.length === 0) newName = 'unknown';
                    else newName = jayson[step].candidates[0].personId;

                    var heshe1 = "She",
                        heshe2 = "she",
                        hisher1 = "Her",
                        hisher2 = "her",
                        himher = "her",
                        type = "woman";
                        if (humans[step].faceAttributes.age < 18) type = 'girl';

                    if (humans[step].faceAttributes.gender == 'male')
                    {
                        heshe1 = "He",
                        heshe2 = "he",
                        hisher1 = "His",
                        hisher2 = "his",
                        himher = "him",
                        type = "man";
                        if (humans[step].faceAttributes.age < 18) type = 'boy';
                    }

                    personArray.push({
                        name: newName,
                        imgId: humans[step].faceId,
                        persId: newName,
                        faceRectangle: humans[step].faceRectangle,
                        faceAttributes: humans[step].faceAttributes,
                        verbosity: {
                            heshe1: heshe1,
                            heshe2: heshe2,
                            hisher1: hisher1,
                            hisher2: hisher2,
                            himher: himher,
                            type: type
                        }
                    });
                }

                getNames(config.key, config.group)
                .then (jay => {

                    let nbUnknownHumans = nbHumans;
                    for (let person of personArray)
                    {
                        for (let each of jay)
                        {
                            if (each.personId === person.name)  { 
                                person.name = each.name;
                                nbUnknownHumans--;  }
                        }
                    }

                    data.payload = "OK";

                    let jason = { 
                        irma: {
                            nbPersons : nbHumans,
                            nbUnknownPersons : nbUnknownHumans,
                            persons : personArray
                        }
                    };

                    extend(true, data, jason);
                    node.send(data);
                })
                .catch( err => {
                    data.payload = "ERROR : " + err;
                    return node.send(data);
                })
            })
            .catch( err => {
                data.payload = "ERROR : " + err;
                return node.send(data);
            })
        }
    })
    .catch( err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
        
}


const getHumans = (apiKey, value) => {

    let req = {
        url: 'https://westus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,facialHair,glasses,emotion',
        method: 'POST',
        body: value,
        headers: {  
            'Content-type' : 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': apiKey
        }
    }

    return request(req);
}

const identifyPersons = (apiKey, group, facesArray) => {

    let req = {
        url: 'https://westus.api.cognitive.microsoft.com/face/v1.0/identify',
        method: 'POST',
        headers: {  
            'Content-type' : 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey
        },
        body: {
            'personGroupId': group,
            'faceIds': facesArray,
            'maxNumOfCandidatesReturned':1,
            'confidenceThreshold': 0.5
        },
        json: true
    }

    return request(req);
}

const getNames = (apiKey, group, callback) => {
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