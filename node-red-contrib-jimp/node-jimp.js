const Jimp = require("jimp");
const helper = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        stderr = function(data){ node.log(data.toString()); }
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("jimp", register, {});
}

const input = (node, data, config) => {
    if (!data.payload)
        return node.send(data);
    
    
    let input  =  helper.resolve(config.pathIn, data, '')
    let output =  helper.resolve(config.pathOut, data, '')

    Jimp.read(input, function (err, image) {
        if (err) return node.error(err);

        if (config.crop){
            let crop = helper.resolve(config.crop, data, '') 
            image.crop(parseInt(crop.x || crop.left), 
                       parseInt(crop.y || crop.top),
                       parseInt(crop.width),
                       parseInt(crop.height));
        }

        if (output){
            image.write(output, function(){
                data.payload = output;
                node.send(data);
            });
        } else {
            image.getBuffer(Jimp.MIME_AUTO, function(err, buffer){
                data.payload = buffer;
                node.send(data);
            });
        }
    })
}
