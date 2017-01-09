'use strict';

const apiAi = require('apiai');
const md5   = require('md5');
const Joi   = require('joi');

const helper = require('node-red-helper');

const configValidationScheme = {
    token: Joi.string().length(32).hex().required(),
    language: Joi.string().empty('').regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
    session: Joi.string().required(),
    text: Joi.string().required()
};

const configObjectValidation = (config) => {
    const result = Joi.validate(config, configValidationScheme, { allowUnknown: true });
    if (result.error) {
        throw new Error(result.error);
    }
};

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        let node = this;

        configObjectValidation(config);

        //API.AI Initialization
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