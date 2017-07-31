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
        this.facekey = RED.nodes.getNode(config.facekey);
        this.emotionkey = RED.nodes.getNode(config.emotionkey);
        this.visionkey = RED.nodes.getNode(config.visionkey);
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("vision-get-persons", register, {});
}

const input = (node, data, config) => {

    let facekey = node.facekey.key;
    let getceleb = config.celeb;
    let = "";
    if (node.visionkey !== null) visionkey = node.visionkey.key;
    let imagetype = config.imagetype;
    let image = config.image;

    if (imagetype === "type-attach" || imagetype === "type-buffer"){
        image = helper.getByString(data, image  || 'message.attachments[0].contentUrl');
    }

    getImage(data, image, imagetype)
        .then (json => {

            if (imagetype !== "type-buffer") image = json;
            getPersons( facekey, image)
                .then( jason => {

                    let persons = JSON.parse(jason);
                    if (getceleb === true) {
                        getCeleb(visionkey, image)
                        .then (jay => { 

                            let json = JSON.parse(jay);
                            let celebrities = json.result.celebrities;
                            if ((celebrities === undefined) || (celebrities.length === 0))
                            {
                                data.payload = persons;
                                return node.send(data);
                            }
                            else {
                                for (let celebrity of celebrities) {
                                    if (celebrity.confidence > 0.4) 
                                    {
                                        let celebName = celebrity.name.toLowerCase();
                                        let celebArray = celebName.split(/(\s+)/);
                                        celebName = "";
                                        for (word of celebArray) celebName += word[0].toUpperCase() + word.substring(1);
                                        
                                        for (person of persons) {
                                            if ((person.faceRectangle.top -10 < celebrity.faceRectangle.top && person.faceRectangle.top +10 > celebrity.faceRectangle.top) &&
                                                (person.faceRectangle.left -10 < celebrity.faceRectangle.left && person.faceRectangle.left +10 > celebrity.faceRectangle.left))
                                            {
                                                person.celebrity = { name: celebName, confidence: celebrity.confidence};
                                            }
                                        }
                                    }   
                                }
                                data.payload = persons;
                                return node.send(data);
                            }
                        })
                        .catch(err => {
                            data.payload = "ERROR : " + err;
                            return node.error(data);
                        })
                    }
                    else {
                        data.payload = persons;
                        return node.send(data);
                    }
                })
                .catch(err => {
                    data.payload = "ERROR : " + err;
                    return node.error(data);
                })
        })
        .catch(err => {
            data.payload = "ERROR : " + err;
            return node.error(data);
        });
    }


const getCeleb = (apiKey, image) => {
    let req = {
        url: 'https://westus.api.cognitive.microsoft.com/vision/v1.0/models/celebrities/analyze',
        method: 'POST',
        body: image,
        headers: {  
            'Content-type' : 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': apiKey
        }
    };

    return request(req);
}

const getPersons = (apiKey, value) => {
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

const getFromUrl = (attachment) => {
    let req = {
        encoding: null,
        url: attachment,
        method: 'GET'
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
