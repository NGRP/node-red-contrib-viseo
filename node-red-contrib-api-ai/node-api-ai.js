'use strict';

const apiAi  = require('apiai');
const md5    = require('md5');
const helper = require('node-red-viseo-helper');


module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        // API.AI Initialization
        const apiConfig = { language: config.language || 'en' };
        const app = apiAi(config.token, apiConfig);
        node.log('API AI Initialization completed');

        this.on('input', (data) => {
            input(node, data, config, app, RED);
        });
    }

    RED.nodes.registerType('api-ai', register, {});
};

const input = (node, data, config, app, RED) => {
    try {
        const text = helper.resolve(config.text, data);
        const request = app.textRequest(text, { sessionId: md5(config.session) });

        request.on('response', function (response) {
            node.log(JSON.stringify(response));
            RED.util.setMessageProperty(data, config.intent || 'payload', response, true);
            node.send(data);
        });

        request.on('error', function (error) {
            node.error(error);
            node.send([null, data]);
        });
        
        request.end();

    } catch (err) {
        node.error(err);
    }
};