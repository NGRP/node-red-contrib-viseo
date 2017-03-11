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
        
        start(node, config);
        this.on('input', (data)  => { input(node, data, config); });
        this.on('close', (cb)    => { stop(node, cb, config)  });
    }

    RED.nodes.registerType('api-ai', register, {});
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

    let apiConfig = { language: config.language || 'en' };
    CACHE[key] = apiAi(config.token, apiConfig);
    node.log('API AI Initialization completed');
}


const input = (node, data, config) => {
    let key = config.token;
    let app = CACHE[key];

    try {
        let text    = helper.resolve(config.text || '{payload}', data);
        let session = helper.resolve(config.session, data);
        let request = app.textRequest(text, { sessionId: md5(session) });

        request.on('response', function (response) {
            node.log(JSON.stringify(response));
            helper.setByString(data, config.intent || 'payload', response);
            node.send(data);
        });

        request.on('error', function (error) {
            node.error(error);
            node.send(data);
        });
        
        request.end();

    } catch (err) { node.error(err); }
};