const Jimp = require("jimp");
const helper = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("jimp", register, {});
}


async function input (node, data, config) {

    let pathIn  = (config.pathInType  === "msg") ? helper.getByString(data, config.pathIn)  : config.pathIn  || 'data/input.jpg' ;
    let pathOut = (config.pathOutType === "msg") ? helper.getByString(data, config.pathOut) : config.pathOut || 'data/output.jpg';
    let action =  config.action || "crop";
    let image;

    try { 
        image = await Jimp.read(pathIn);
    }
    catch (err) {
        node.error(err);
        return node.send([null, data])
    }

    if (action === "read") {
        data._Jimp = Jimp
	helper.setByString(data, pathOut, image)
        return node.send([data, null])

    } 
    else if (action === "draw") {
        let drawRect = (config['draw-rectType'] === "msg") ? helper.getByString(data, config['draw-rect'] || 'payload') : config['draw-rect'];
        let drawLogo = (config['draw-logoType'] === "msg" && config['draw-logo']) ? helper.getByString(data, config['draw-logo']) : config['draw-logo'];

        let old_w;
        let old_h;
        let w, h;

        if (typeof(drawRect) === 'string') {
            try { drawRect = JSON.parse(drawRect); }
            catch (err) {
                node.error(err);
                return node.send([null, data])
            }
        }

        if (drawLogo) {
            old_w = image.bitmap.width;
            old_h = image.bitmap.height;
            w = (old_w > old_h) ? Jimp.AUTO : 400;
            h = (old_w < old_h) ? Jimp.AUTO : 400;

            try { image.resize(w, h); }
            catch (err) {
                node.error(err);
                return node.send([null, data])
            }

            w = image.bitmap.width;
            h = image.bitmap.height;
        }

        try {
            font_white = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
            font_black = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
        }
        catch (err) {
            node.error(err);
            return node.send([null, data])
        }

        for (let face of drawRect) {
            if (!face.top || !face.left || !face.width || !face.height) {
                throw TypeError("Some of the Rectangle object properties are missing, eg: top, left, width and/or height.");
            }
            if (drawLogo) {
                face.top = Math.round(face.top * (h/old_h));
                face.left = Math.round(face.left * (w/old_w));
                face.width = Math.round(face.width * (w/old_w));
                face.height = Math.round(face.height* (h/old_h));
            }
            try {
                if (face.label) {
                    image.print(font_black, face.left, face.top + face.height + 8, face.label, face.width);
                    image.print(font_white, face.left + 2, face.top + face.height + 6, face.label, face.width);
                }

                image.scan(face.left - 2, face.top - 2, face.width + 4, 4, black_iterator); 
                image.scan(face.left - 2, face.top - 2 + face.height + 4, face.width + 8, 4, black_iterator);
                image.scan(face.left - 2, face.top - 2, 4, face.height + 4, black_iterator);
                image.scan(face.left - 2 + face.width + 4, face.top - 2, 4, face.height + 8, black_iterator);

                image.scan(face.left, face.top, face.width + 2, 2, white_iterator); 
                image.scan(face.left, face.top + face.height + 2, face.width + 4, 2, white_iterator);
                image.scan(face.left, face.top, 2, face.height + 2, white_iterator);
                image.scan(face.left + face.width + 2, face.top, 2, face.height + 4, white_iterator);

            }
            catch (err) {
                node.error(err);
                return node.send([null, data])
            }
        }

        if (drawLogo) {
            let newImage = new Jimp(w +20, h+58, 0xFFFFFFFF);
                newImage.blit(image, 10, 10);
            try {
                let logo = await Jimp.read(drawLogo);
                newImage.composite( logo, 10, h+20);
                image = newImage;
            }
            catch (err) {
                node.error(err);
                return node.send([null, data])
            }
        }

    }

    else if (action === "crop") {
        let cropRect = (config['crop-rectType'] === "msg") ? helper.getByString(data, config['crop-rect'] || 'payload') : config['crop-rect'];

        if (typeof(cropRect) === 'string') {
            try { cropRect = JSON.parse(cropRect); }
            catch (err) {
                node.error(err);
                return node.send([null, data])
            }
        }
        if (!cropRect.top || !cropRect.left || !cropRect.width || !cropRect.height) {
            node.error("Some of the Rectangle object properties are missing, eg: top, left, width and/or height.");
            return node.send([null, data])
        }

        image.crop(cropRect.left, cropRect.top, cropRect.width, cropRect.height);
    }

    // 1. pathOut is a file (regular usage)
    if ((/\.(jpg|png|gif|jpeg|tiff|bmp)/gi).test(pathOut)){
        try {
            image.write(pathOut)
            return node.send([data, null])
        } catch(ex){
            node.error(ex);
            return node.send([null, data])
        }
    }

    // 2. otherwise set the buffer in the flow in PNG
    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => { 
        if (err) {
            node.error(err);
            return node.send([null, data])
        }
        helper.setByString(data, pathOut, buffer)
        return node.send([data, null])
    });
}

// border 
async function black_iterator(x, y, offset) { 
    this.bitmap.data.writeUInt32BE(0x00000088, offset, true); 
}

async function white_iterator(x, y, offset) { 
    this.bitmap.data.writeUInt32BE(0xFFFFFFFF, offset, true); 
}
