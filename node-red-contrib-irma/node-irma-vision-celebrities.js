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
    RED.nodes.registerType("irma-celebrities", register, {});
}

const input = (node, data, config) => {

    let image = helper.getByString(data, config.image || 'payload');
    if (typeof image !== 'object'){
        data.payload = "ERROR : The image is not a buffer";
        return node.send(data);
    }

    let person = helper.getByString(data, config.person);
    if (typeof person !== 'object'){
        data.payload = "ERROR : The person is not an object";
        return node.send(data);
    }

    getCeleb(config.key, image)
    .then (jay => { 
        let json = JSON.parse(jay);
        let celebrities = json.result.celebrities;
        if ((celebrities === undefined) || (celebrities.length === 0))
        {
            data.payload = "No celebrity";
            return node.send(data);
        }
        else {
            data.payload = "No celebrity";
            let getName = config.person + "[0].name";
            for (let celeb of celebrities)
            {
                if (celeb.confidence > 0.4) 
                {
                    let celebName = celeb.name.toLowerCase();
                    let celebArray = celebName.split(/(\s+)/);
                    celebName = "";
                    for (word of celebArray) celebName += word[0].toUpperCase() + word.substring(1);
                    
                    if ((person.faceRectangle.top -10 < celeb.faceRectangle.top && person.faceRectangle.top +10 > celeb.faceRectangle.top) &&
                        (person.faceRectangle.left -10 < celeb.faceRectangle.left && person.faceRectangle.left +10 > celeb.faceRectangle.left))
                    {
                        let getName = config.person + ".name";
                        helper.setByString(data, getName, celebName);
                        data.payload = "" + celeb.confidence;
                    }
                }
            }
            return node.send(data);
        }
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
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