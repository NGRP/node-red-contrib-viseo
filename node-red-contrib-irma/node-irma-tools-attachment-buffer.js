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
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("irma-attachment-buffer", register, {});
}

const input = (node, data, config) => {

    let value = helper.getByString(data, config.attachment || 'message.attachments[0].contentUrl');
    if (value === undefined) value = config.attachment;
    if (typeof value !== 'string'){
        data.payload = "ERROR : The location is not a string";
        return node.send(data);
    }

    getFromUrl(value)
    .then (json => {
        data.irma = data.irma || {};
        helper.setByString(data,config.buffer,json);
        data.payload = "OK";
        node.send(data);
    })
    .catch(err => {
    data.payload = "ERROR : " + err;
    return node.send(data);
    });
}


const getFromUrl = (attachment, callback) => {
    let req = {
        encoding: null,
        url: attachment,
        method: 'GET'
    };

    return request(req);
}