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

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        this.visionkey = RED.nodes.getCredentials(config.visionkey);

        if (this.visionkey) node.status({});

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("vision-image-describe", register, {});
}

async function input (node, data, config) {
    let visionkey = node.visionkey,
        features = config.features,
        celebrities = config.celebrities,
        landmarks = config.landmarks;

    // Keys
    try {           visionkey = visionkey.key || undefined; }
    catch(err) {    return node.error("ERROR: MS Vision API key is required to get celebrities information."); }

    // Image
    let imageType = config.imageT || 'msg',
    image = config.image || 'message.attachments[0].contentUrl';

    if (imageType !== 'str') {
        let loc = (imageType === 'global') ? node.context().global : data;
        try         { image = helper.getByString(loc, image); }
        catch(err)  { return node.error('ERROR: Can not find the image.'); }
    }

    // Parameters
    let PROPERTIES = ['Categories', 'Tags', 'Description', 'Faces', 'ImageType', 'Color', 'Adult'];
    
    let parameters = [];
    if (features) parameters = PROPERTIES;
    else {
        for (let item of PROPERTIES) if (config[item]) parameters.push(item);
    }
    
    // Process
    try {
        let infos = JSON.parse( await getInfo( visionkey, image, parameters,  celebrities, landmarks));
        data.payload = infos;
        return node.send(data);
    }
    catch(err) { return node.error(err); }
}

async function getInfo (apiKey, image, parameters, celebrities, landmarks) {

    let url = 'https://westus.api.cognitive.microsoft.com/vision/v1.0/analyze?';

    if (parameters.length > 0) {
        url += 'visualFeatures=';
        for (let attribute of parameters) url += (attribute + ',');
        url = url.substring(0, url.length - 1);
    }
    if (celebrities || landmarks) {
        url += (parameters.length > 0) ? '&details=' : 'details=';
        if (celebrities) url += 'Celebrities';
        else url += 'Landmarks';
        if (landmarks) url += ',Landmarks';
    }

    url += '&language=en';

    let req = {
        uri: url,
        method: 'POST',
        body: image,
        headers: {  
            'Content-type' : 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey
        }
    };

    if (typeof image === 'string') {
        if (image.indexOf('http') != -1) req.body =  JSON.stringify({'url': image });
        else req.body = fs.readFileSync(image);
    }   else req.headers['Content-type'] = 'application/octet-stream';

    return request(req);
}