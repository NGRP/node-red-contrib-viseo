'use strict';

const helper = require('node-red-viseo-helper');
const apiAi  = require('apiai');
const md5    = require('md5');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        config.token = this.credentials.token;
        node.status({fill:"red", shape:"ring", text: 'Deprecated'});
        node.error("This package is old, please install and use node-red-contrib-viseo-dialogflow instead of node-red-contrib-viseo-api-ai.")

        start(node, config);
        this.on('input', (data)  => { input(node, data, config); });
        this.on('close', (cb)    => { stop(node, cb, config)  });
    }

    RED.nodes.registerType('api-ai', register, {
        credentials:  {
            token:    { type:"text" }
        }
    });
};


let CACHE = {};


const stop = (node, cb, config) => {
    let key = config.token;
    if (key) CACHE[key] = undefined;
    cb();
}

const start = (node, config) => {
    let key = config.token;
    if (CACHE[key]) return; 

    let language = config.language || "en";

    let apiConfig = {language: language};
    CACHE[key] = apiAi(config.token, apiConfig);
    node.log('API AI Initialization completed');
}


const input = (node, data, config) => {
    let key = config.token;
    let app = CACHE[key];

    let session = config.session || "user.id",
        text = config.text || "payload",
        intent = config.intent || "payload";

    if (config.sessionType !== 'str') {
        let loc = (config.sessionType === 'global') ? node.context().global : data;
        session = helper.getByString(loc, session); }
    if (config.textType !== 'str') {
        let loc = (config.textType === 'global') ? node.context().global : data;
        text = helper.getByString(loc, text); }

    let intentLoc = (config.intentType === 'global') ? node.context().global : data;

    try {
        let request = app.textRequest(text, { sessionId: md5(session) });

        request.on('response', function (response) {
            node.log(JSON.stringify(response));

            helper.setByString(intentLoc, intent, response);
            node.send(data);
        });

        request.on('error', function (error) {
            node.error(error);
            node.send(data);
        });
        
        request.end();

    } catch (err) { node.error(err); }
};