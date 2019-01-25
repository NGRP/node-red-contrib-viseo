'use strict';

const helper  = require('node-red-viseo-helper');
const AWS = require('aws-sdk');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credentials'})

        if (config.token) {
            config.creds = RED.nodes.getCredentials(config.token);
            node.status({});
        }
    
        start(config);
        this.on('input', (data)  => { input(RED, node, config, data); });
        this.on('close', (done) => { stop(node, config, done) });
    }
    RED.nodes.registerType('aws-lex', register, {});
};

let _AWS = {};

function start(config) {
    if (!config.token || _AWS[config.token]) return;
    if (!config.creds || !config.creds.accessKeyId || !config.creds.secretAccessKey) return;
    _AWS[config.token] = new AWS.LexRuntime(config.creds);
}

function input (RED, node, config, data) {

    let lexruntime = _AWS[config.token];
    if (!config.botname || !config.botalias || !lexruntime ) {
        let err = (!config.botname || !config.botalias) ? "Missing bot information" : "Missing credentials";
        helper.setByString(data, config.output || "payload" , { error: err });
        node.warn("AWS Lex: Error - " + err);
        return node.send(data);
    }


    config.creds.region = config.creds.region || "us-east-1";
    let action = config.action || "postText";
    let input = helper.getContextValue(RED, node, data, config.input || "payload", config.inputType);
    let userid = helper.getContextValue(RED, node, data, config.userid || "user.id", config.useridType);

    let parameters = {
        botName: config.botname,
        botAlias: config.botalias,
        userId: userid
    }

    if (config.requestA) parameters.requestAttributes = helper.getContextValue(RED, node, data, config.requestA, config.requestAType);
    if (config.sessionA) parameters.sessionAttributes = helper.getContextValue(RED, node, data, config.sessionA, config.requestAType);

    if (action === "postText") {
        parameters.inputText = input;
        lexruntime.postText(parameters, function (err, res) {
            if (err) {
                helper.setByString(data, config.output || "payload" , { error: err });
                node.warn("AWS Lex: Error - postText - " + err);
                return node.send(data);
            }

            let formattedResponse = {
                query: input ,
                intent: (res.dialogState === "ElicitIntent") ? "ElicitIntent" : res.intentName,
                score: null,
                entities: res.slots,
                source: "lex",
                completeResponse: res
            }

            helper.setByString(data, config.output || "payload" , formattedResponse);
            return node.send(data);
        });
    }

    else {

        parameters.inputStream = input;
        parameters.contentType = (config.contentType) ? helper.getContextValue(RED, node, data, config.content, config.contentType) : parameters.contentType = config.contentType;y
        
        lexruntime.postContent(parameters, function (err, res) {
            if (err) {
                helper.setByString(data, config.output || "payload" , { error: err });
                node.warn("AWS Lex: Error - postContent - " + err);
                return node.send(data);
            }

            let query = res.inputTranscript;
            if (!query) {
                if (config.contentType === 'str' || config.contentType === "text/plain; charset=utf-8") query = input;
                if (res.dialogState !== "ElicitIntent" && res.dialogState !== "Failed") query = input;
            }
            
            let formattedResponse = {
                query: query,
                intent: res.intentName || res.dialogState,
                score: null,
                entities: res.slots,
                source: "lex",
                completeResponse: res
            }

            helper.setByString(data, config.output || "payload" , formattedResponse);
            return node.send(data);
        });
    }

};

function stop(node, config, done) {
    if (_AWS[config.token]) delete _AWS[config.token];
    done();
}
