const helper  = require('node-red-viseo-helper');
const Jimp    = require("jimp");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("irma-crop-a-face", register, {});
}

const input = (node, data, config) => {
    
    let value = helper.getByString(data, config.image || 'payload');
    if (typeof value !== 'object'){
    	data.payload = "ERROR : Image is not a buffer";
    	return node.send(data);
    }

    let person = helper.getByString(data, config.person || 'irma.persons[0]');
    if (typeof person !== 'object'){
    	data.payload = "ERROR : Person is not an object";
    	return node.send(data);
    }

    let path = helper.resolve(config.path, data);
	Jimp.read(value)
    .then(image => {
        let imgTop = person.faceRectangle.top,
            imgLeft = person.faceRectangle.left,
            imgWidth = person.faceRectangle.width,
            imgHeight = person.faceRectangle.height;

        image.crop(imgLeft,imgTop,imgWidth, imgHeight);
        image.write(path);
        data.payload = "OK";
        return node.send(data);
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}