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
    
        this.on('input', (data)  => { input(node, data, config); });
    }
    RED.nodes.registerType('aws-lex', register, {});
};

async function input (node, data, config) {

    if (!config.botname || !config.botalias || !config.creds ||
        !config.creds.accessKeyId || !config.creds.secretAccessKey ) {
        let err = (!config.botname || !config.botalias) ? "Missing bot information" : "Missing credentials";
        helper.setByString(data, config.output || "payload" , { error: err });
        console.log("AWS Lex: Error - " + err);
        return node.send(data);
    }


    config.creds.region = config.creds.region || "us-east-1";
    let action = config.action || "postText";
    let input = config.input   || "payload";
    let userid = config.userid || "user.id";
    let requestA = config.requestA;
    let sessionA = config.sessionA;

    let parameters = {
        botName: config.botname,
        botAlias: config.botalias,
        userId: userid
    }

    if (config.inputType !== 'str') {
        let loc = (config.inputType === 'global') ? node.context().global : data;
        input = helper.getByString(loc, input);
    }
    if (config.useridType !== 'str') {
        let loc = (config.useridType === 'global') ? node.context().global : data;
        parameters.userid = helper.getByString(loc, parameters.userid);
    }
    if (requestA) {
        if (config.requestAType.match(/msg|global/)) {
            let loc = (config.requestAType === 'global') ? node.context().global : data;
            requestA = helper.getByString(loc, requestA);
        }
        if (typeof requestA === 'string' && (config.requestAType === 'json' || 
        requestA[0] === '{' || requestA[0] === '[')) { 
            requestA = JSON.parse(requestA);
        }
        parameters.requestAttributes = requestA;
    }
    if (sessionA) {
        if (config.sessionAType.match(/msg|global/)) {
            let loc = (config.sessionAType === 'global') ? node.context().global : data;
            sessionA = helper.getByString(loc, sessionA);
        }
        if (typeof sessionA === 'string' && (config.sessionAType === 'json' || 
        sessionA[0] === '{' || sessionA[0] === '[')) { 
            sessionA = JSON.parse(sessionA);
        }
        parameters.sessionAttributes = sessionA;
    }


    let lexruntime = new AWS.LexRuntime(config.creds);

    if (action === "postText") {
        parameters.inputText = input;
        lexruntime.postText(parameters, function (err, res) {
            if (err) {
                helper.setByString(data, config.output || "payload" , { error: err });
                console.log("AWS Lex: Error - postText - " + err);
                return node.send(data);
            }

            helper.setByString(data, config.output || "payload" , res);
            return node.send(data);
        });
    }

    else {

        parameters.inputStream = input;
        parameters.contentType = config.content;

        if (config.contentType.match(/msg|global/)) {
            let loc = (config.contentType === 'global') ? node.context().global : data;
            parameters.contentType = helper.getByString(loc, parameters.contentType);
        }
        else if (!config.content) {
            parameters.contentType = config.contentType;
        }
        
        lexruntime.postContent(parameters, function (err, res) {
            if (err) {
                helper.setByString(data, config.output || "payload" , { error: err });
                console.log("AWS Lex: Error - postContent - " + err);
                return node.send(data);
            }

            helper.setByString(data, config.output || "payload" , res);
            return node.send(data);
        });
    }

};
