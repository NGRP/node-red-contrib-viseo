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
    RED.nodes.registerType("irma-draw-faces", register, {});
}

const input = (node, data, config) => {
    
    let image = helper.getByString(data, config.image || 'payload');
    if (typeof image !== 'object'){
    	data.irma.info = "ERROR : Image is not a buffer";
    	return node.send(data);
    }

    let array = helper.getByString(data, config.array || "irma.persons");
    if (typeof array !== 'object'){
        data.irma.info = "ERROR : Array is not an object";
        return node.send(data);
    }

    let path = helper.resolve(config.path, data);
	Jimp.read(image)
    .then (image => {
        // RESIZE
        let w = image.bitmap.width,
            old_w = w,
            h = image.bitmap.height,
            old_h = h;

        if (w > h) {        image.resize(Jimp.AUTO, 400);
                            w = image.bitmap.width,
                            h = 400;    } 
        else if (w < h) {   image.resize(400, Jimp.AUTO);
                            w = 400;
                            h = image.bitmap.height;   } 
        else {              image.resize(400, 400);
                            w = 400;
                            h = 400;    }

        for (let person of array) {
            let imgTop = person.faceRectangle.top*(h/old_h),
                imgLeft = person.faceRectangle.left*(w/old_w),
                imgWidth = person.faceRectangle.width*(w/old_w),
                imgHeight = person.faceRectangle.height*(h/old_h);

            image.scan(imgLeft-1         , imgTop-1          , imgWidth, 3        , white_iterator);  
            image.scan(imgLeft-1         , imgTop-1+imgHeight, imgWidth, 3        , white_iterator);
            image.scan(imgLeft-1         , imgTop-1          , 3       , imgHeight, white_iterator);
            image.scan(imgLeft-1+imgWidth, imgTop-1          , 3       , imgHeight, white_iterator);

            image.scan(imgLeft         , imgTop          , imgWidth, 1        , black_iterator); 
            image.scan(imgLeft         , imgTop+imgHeight, imgWidth, 1        , black_iterator);
            image.scan(imgLeft         , imgTop          , 1       , imgHeight, black_iterator);
            image.scan(imgLeft+imgWidth, imgTop          , 1       , imgHeight, black_iterator);

        }

        Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)
        .then( function (font) {

            for (let person of array){
                imgTop = person.faceRectangle.top*(h/old_h);
                imgLeft = person.faceRectangle.left*(w/old_w);
                imgWidth = person.faceRectangle.width*(w/old_w);
                imgHeight = person.faceRectangle.height*(h/old_h);

                image.print(font, imgLeft+5, imgTop + imgHeight+2, person.name,imgHeight);
            }

            Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
            .then( function (font) {

                for (let person of array){
                    imgTop = person.faceRectangle.top*(h/old_h);
                    imgLeft = person.faceRectangle.left*(w/old_w);
                    imgWidth = person.faceRectangle.width*(w/old_w);
                    imgHeight = person.faceRectangle.height*(h/old_h);

                    image.print(font, imgLeft+7, imgTop + imgHeight, person.name,imgHeight);
                }

                // CREATE NEW IMAGE
                let newImage = new Jimp(w +20, h+58, 0xFFFFFFFF);

                // PASTE IMAGE ON NEWIMAGE
                newImage.blit(image, 10, 10);

                Jimp.read("data/viseo.png")
                .then( viseo => {
                    newImage.composite( viseo, 10, h+20);
                    newImage.write(path)
                    .then( result => {
                        data.payload = "OK";
                        return node.send(data);
                    })
                    .catch(err => {
                    data.payload = "ERROR : " + err;
                    return node.send(data);
                    })
                })
                .catch(err => {
                data.payload = "ERROR : " + err;
                return node.send(data);
                })
            })
            .catch(err => {
                data.payload = "ERROR : " + err;
                return node.send(data);
            })
        })
        .catch(err => {
            data.payload = "ERROR : " + err;
            return node.send(data);
        })
    })
    .catch(err => {
        data.payload = "ERROR : " + err;
        return node.send(data);
    });
}

// border 
function black_iterator(x, y, offset) { 
    this.bitmap.data.writeUInt32BE(0x00000088, offset, true); 
}

function white_iterator(x, y, offset) { 
    this.bitmap.data.writeUInt32BE(0xFFFFFF88, offset, true); 
}