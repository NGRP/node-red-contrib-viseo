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
        this.facekey = RED.nodes.getCredentials(config.facekey);
        this.visionkey = RED.nodes.getCredentials(config.visionkey);

        if (this.facekey && this.facekey) node.status({});
        
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("vision-image-faces", register, {});
}

async function input(node, data, config){

    let getceleb = config.celeb,
        faceid = config.faceid,
        landmarks = config.landmarks,
        attributes = config.attributes,
        facekey = node.facekey,
        visionkey = node.visionkey;

    // Keys
    try { facekey =  facekey.key; }
    catch(err) { return node.error("ERROR: MS Face API key is required to get celebrities information."); }

    if (getceleb === true) {
        try { visionkey = visionkey.key || undefined; }
        catch(err) { return node.error("ERROR: MS Vision API key is required to get celebrities information."); }
    } 

    // Image
    let imageType = config.imageType || 'msg',
        image = config.image || 'message.attachments[0].contentUrl';

    if (imageType !== 'str') {
        let loc = (imageType === 'global') ? node.context().global : data;
        try         { image = helper.getByString(loc, image); }
        catch(err)  { return node.error('ERROR: Can not find the image.'); }
    }

    // Parameters
    let PROPERTIES = ['age', 'gender', 'smile', 'facialHair', 'headPose', 'glasses', 'emotion', 'hair', 'makeup', 'accessories', 'occlusion', 'blur', 'exposure', 'noise' ];

    let parameters = [];
    if (attributes) parameters = PROPERTIES;
    else {
        for (let item of PROPERTIES) if (config[item]) parameters.push(item);
    }

    // Process
    try { 
        persons = JSON.parse( await getPersons( facekey, image, faceid, landmarks, parameters));
    
        if (getceleb === true) {
            let celebrities = JSON.parse( await getCeleb(visionkey, image)); 
                celebrities = celebrities.result.celebrities;

            for (person of persons) { person.celebrity = { name: 'unknown'}};
                
            if ((celebrities !== undefined) && (celebrities.length > 0)) {
                for (let celebrity of celebrities) {
                    if (celebrity.confidence > 0.4) {
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
            }
        }  
        data.payload = persons;
        return node.send(data);
    }
    catch(err) { return node.error(err); }
}

async function getCeleb (apiKey, image) {
    let req = {
        uri: 'https://westus.api.cognitive.microsoft.com/vision/v1.0/models/celebrities/analyze',
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

async function getPersons (apiKey, image, faceid, landmarks, parameters) {

    let url = 'https://westus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=';
    url += (faceid) ? 'true' : 'false';
    url += (landmarks) ? '&returnFaceLandmarks=true' : '&returnFaceLandmarks=false';
    
    if (parameters.length > 0) {
        url += '&returnFaceAttributes=';
        for (let attribute of parameters) url += (attribute + ',');
        url = url.substring(0, url.length - 1);
    }

    let req = {
        uri: url,
        method: 'POST',
        body: image,
        headers: { 
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/json' }
    }

    if (typeof image === 'string') {
        if (image.indexOf('http') != -1) req.body =  JSON.stringify({'url': image });
        else req.body = fs.readFileSync(image);
    }   else req.headers['Content-type'] = 'application/octet-stream';

    return request(req);
}