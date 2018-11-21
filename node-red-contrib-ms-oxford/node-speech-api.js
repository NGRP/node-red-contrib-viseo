const fs = require('fs');
const rp = require('request-promise');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
//  https://docs.microsoft.com/en-us/azure/cognitive-services/speech/getstarted/getstartedrest
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        config.key = RED.nodes.getCredentials(config.key);
        if (config.key && config.key.key) node.status({});

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-speech-text", register, {});
}

async function input (node, data, config) {

    let api = config.api || 'stt';
    let input = config.input || "payload";
    let output = config.output || "payload";
    let token = config.token;
    let tryToken = false;
    let parameters = {};

    if (config.inputType === "msg") input = helper.getByString(data, input);
    if (token && config.tokenType === "msg") token = helper.getByString(data, token);



    if (api === 'stt') {

        // 1. Get Access Token
        if (!token) {
            tryToken = true;
            try {
                token = await getToken(config.key.key, config.key.region);
            }
            catch(err) {
                node.error(err);
                return node.send([null, data]);
            }
        }

        // 2. Prepare request
        let language =    (config.languageType === 'msg') ?     helper.getByString(data, config.language) : config.language;
        let contentType = (config.contentTypeType === 'msg') ?  helper.getByString(data, config.contentType) : config.contentType;

        if (typeof input === "string") input = fs.readFileSync(input);

        parameters.language =    language || 'fr-FR';
        parameters.contentType = contentType || 'audio/wav; codec="audio/pcm"; samplerate=16000';
        
        // 3. Send request
        try {
            let result = await STT(input, parameters, token);
            try { result = JSON.parse(result); }
            catch(ex) { node.warn('JSON Parse Exception: ' + result) }

            // 4. Send result
            helper.setByString(data, output, {token: token, result: result});
            return node.send([data, null]);
        }
        catch (err) {
            // 4 bis. Get a new token and retry
            if (typeof(err) === "string" && err.match(/403/) && !tryToken) {
                tryToken = true;
                try {
                    token = await getToken(parameters, config.key.key);
                    let result = await STT(input, parameters, token);
                    try { result = JSON.parse(result); }
                    catch(ex) { node.warn('JSON Parse Exception: ' + result) }
        
                    helper.setByString(data, output, {token: token, result: result});
                    return node.send([data, null]);
                }
                catch(err) {
                    node.error(err);
                    return node.send([null, data]);
                }
            }
            node.error(err);
            return node.send([null, data]);
        }
    }
    else {
         // 1. Prepare request
        let userAgent = (config.userAgentType === 'msg') ?     helper.getByString(data, config.userAgent) : config.userAgent;
        let outFormat = (config.outputFormatType === 'msg') ?  helper.getByString(data, config.outputFormat) : config.outputFormat;
        let region =    (config.regionType === 'msg') ?        helper.getByString(data, config.region) : config.region;

        parameters["X-Microsoft-OutputFormat"] = outFormat || "ssml-16khz-16bit-mono-tts";
        parameters["region"] = region || "westus";
        parameters["User-Agent"] = userAgent || undefined;

        // 2. Get Access Token
        if (!token) {
            tryToken = true;
            try {
                token = await getToken(config.key.key, region);
            }
            catch(err) {
                node.error(err);
                return node.send([null, data]);
            }
        }

         // 3. Send request
         try {
             let result = await TTS(input, parameters, token);
             helper.setByString(data,config.output || 'payload', {token: token, result: result});

             return node.send([data, null]);
         }
         catch (err) {
             // 4 bis. Get a new token and retry
             node.warn(err)
             if (typeof(err) === "string" && err.match(/403/) && !tryToken) {
                 tryToken = true;
                 try {
                    token = await getToken(config.key.key, parameters.region);
                    let result = await TTS(input, parameters, token);        
                    helper.setByString(data,config.output || 'payload', {token: token, result: result});
                    return node.send([data, null]);
                 }
                 catch(err) {
                    node.error(err);
                    return node.send([null, data]);
                 }
             }
             node.error(err);
             return node.send([null, data]);
         }
         
    }
}

async function getToken(key, region) {
    region = (region) ? region + '.' : '';
    auth = {
        uri: 'https://' + region + 'api.cognitive.microsoft.com/sts/v1.0/issueToken',
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Length': 0
        }
    }

    return rp(auth);
}




async function STT(input, parameters, token) {
    let URI = 'https://speech.platform.bing.com/speech/recognition/interactive/cognitiveservices/v1?';
    let QS  = 'language='+ parameters.language +'&format=simple&requestid=node-red-viseo';

    let req  = { 
        url: URI + QS,
        method: 'POST',
        headers: { 
            'Authorization': 'Bearer ' +token, 
            'Transfer-Encoding': 'chunked',
            'Content-Type': parameters.contentType
        },
        body: input
    }

    return rp(req);
}

async function TTS(input, parameters, token) {
    let URI = 'https://' + parameters.region + '.tts.speech.microsoft.com/cognitiveservices/v1';
    let req  = { 
        url: URI,
        method: 'POST',
        headers: { 
            'Authorization': 'Bearer ' + token, 
            'Content-Type': 'application/ssml+xml',
            'User-Agent': parameters["User-Agent"],
            'X-Microsoft-OutputFormat' : parameters["X-Microsoft-OutputFormat"]
        },
        body: input,
        encoding: null
    }

    return rp(req);
}