const fs = require('fs');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'})
        if (config.auth) {
            node.auth = RED.nodes.getNode(config.auth);
            node.status({});
        }

        this.on('input', (data)  => { input(RED, node, data, config) });
    }
    RED.nodes.registerType("google-speech-text", register, {});
}

const input = (RED, node, data, config) => {

    // Input
    let input = helper.getContextValue(RED, node, data, config.input || 'payload', config.inputType);

    if (!node.auth) {
        console.log("node.auth was false");
        helper.setByString(data, config.output || "payload", { error: "Missing credentials" });
        return node.send(data);
    }
    
    // Method
    let api = config.api || 'stt';
    let parameters = {};

    if (api === 'tts') {
        parameters.input = {};
        parameters.voice = {};
        parameters.audioConfig = {};
    }
    else {
        parameters.config = {};
        parameters.audio = {};
    }

    let encoding = config.encoding || 'LINEAR16';
    encoding = (config.encodingType === 'msg') ? helper.getByString(data, config.encoding) : encoding;
    if (api === 'stt') parameters.config.encoding = encoding;
    else parameters.audioConfig.audioEncoding = encoding;
    
    let sampleRateHertz = config.sampleRateHertz || '16000';
    sampleRateHertz = (config.sampleRateHertzType === 'msg') ? helper.getByString(data, config.sampleRateHertz) : sampleRateHertz;
    if (api === 'stt') parameters.config.sampleRateHertz = Number(sampleRateHertz);
    else parameters.audioConfig.sampleRateHertz = Number(sampleRateHertz);
    
    let languageCode = config.languageCode || 'fr-FR';
    languageCode = (config.languageCodeType === 'msg') ? helper.getByString(data, config.languageCode) : languageCode;
    if (api === 'stt') parameters.config.languageCode = languageCode;
    else parameters.voice.languageCode = languageCode;
    

    // STT
    if (api === "stt") {

        if (config.maxAlternativesType) {
            let maxAlternatives = (config.maxAlternativesType === 'msg') ? helper.getByString(data, config.maxAlternatives) : config.maxAlternatives;
            parameters.config.maxAlternatives = Number(maxAlternatives);
        }
        if (config.speechContexts) {
            let speechContexts = (config.speechContextsType === 'msg') ? helper.getByString(data, config.speechContexts) : config.speechContexts;
            parameters.config.speechContexts = (typeof speechContexts === 'string') ? JSON.parse(speechContexts) : speechContexts;
        }
        if (typeof parameters.config.speechContexts === 'object' && parameters.config.speechContexts.length === 0) delete parameters.config.speechContexts;

        let profanityFilter = (config.profanityFilterType === 'msg') ? helper.getByString(data, config.profanityFilter) : config.profanityFilter;
        if (typeof profanityFilter === 'string') parameters.config.profanityFilter = (profanityFilter === 'true') ? true : false;
        else parameters.config.profanityFilter = profanityFilter;
        
        let enableWordTimeOffsets = (config.enableWordTimeOffsetsType === 'msg') ? helper.getByString(data, config.enableWordTimeOffsets) : config.enableWordTimeOffsets;
        if (typeof enableWordTimeOffsets === 'string') parameters.config.enableWordTimeOffsets = (enableWordTimeOffsets === 'true') ? true : false;
        else parameters.config.enableWordTimeOffsets = enableWordTimeOffsets;

        let type = config.intype;
        if (type === 'url') parameters.audio.uri = input;
        else if (type === 'content') parameters.audio.content = input;
        else {
            try {
                let buffer = fs.readFileSync(input);
                parameters.audio.content = buffer.toString('base64');
            }
            catch(ex) {
                console.log(ex);
                helper.setByString(data, config.output || "payload", { error: ex });
                return node.send(data);
            }
        }
        const speech = require('@google-cloud/speech');
        let client = new speech.v1.SpeechClient({credentials: node.auth.cred});

        client.recognize(parameters).then((results) => {
            let alternatives = (results[0] && results[0].results && results[0].results[0] && results[0].results[0].alternatives) ? results[0].results[0].alternatives : [];
            helper.setByString(data, config.output || 'payload', { alternatives: alternatives });
            node.send(data);
        }).catch((err) => { 
            console.log(err);
            helper.setByString(data, config.output || 'payload', { error: err });
            node.send(data);
        });
        
    }

    // TTS
    else {

        if (config.speakingRate) {
            let speakingRate = (config.speakingRateType === 'msg') ? helper.getByString(data, config.speakingRate) : config.speakingRate;
            parameters.audioConfig.speakingRate = Number(speakingRate);
        }
        if (config.pitch) {
            let pitch = (config.pitchType === 'msg') ? helper.getByString(data, config.pitch) : config.pitch;
            parameters.audioConfig.pitch = Number(pitch);
        }
        if (config.volumeGainDb) {
            let volumeGainDb = (config.volumeGainDbType === 'msg') ? helper.getByString(data, config.volumeGainDb) : config.volumeGainDb;
            parameters.audioConfig.volumeGainDb = Number(volumeGainDb);
        }
        if (config.voiceName) {
            let voiceName = (config.voiceNameType === 'msg') ? helper.getByString(data, config.voiceName) : config.voiceName;
            parameters.voice.voice = voiceName;
        }
        if (config.ssmlGender) {
            let ssmlGender = (config.ssmlGenderType === 'msg') ? helper.getByString(data, config.ssmlGender) : config.ssmlGender;
            parameters.voice.ssmlGender = ssmlGender;
        }


        if (input.match(/<speak>/ig)) parameters.input.ssml = input;
        else parameters.input.text = input;

        const texttospeech = require('@google-cloud/text-to-speech');
        let client = new texttospeech.v1beta1.TextToSpeechClient({credentials: node.auth.cred});
        let res = { audioContent: [] }
        
        client.synthesizeSpeech(parameters)
        .then((results) => {
            res.audioContent = (results[0] && results[0].audioContent) ? results[0].audioContent : [];

            if (!config.getVoices) return 1;
            else return client.listVoices({languageCode: parameters.voice.languageCode = languageCode})
        })
        .then((voices) => {
            if (voices !== 1 && voices[0] && voices[0].voices) {
                res.voices = (voices[0] && voices[0].voices) ? voices[0].voices : [];
            }
            helper.setByString(data, config.output || 'payload', res);
            return node.send(data);
        }).catch((err) => { 
            console.log(err);
            helper.setByString(data, config.output || 'payload', {error: err});
            return node.send(data);
        });
    }
}
