'use strict';

const CryptoJS = require("crypto-js");
const helper  = require('node-red-viseo-helper');

module.exports = function(RED) {

	const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("tokenizer", register);
}


const input = (node, data, config) => {
	let source = config.source || 'payload';
        source = helper.getByString(data, source);

    let stringToTokenize = '';

    if(typeof source === "object" || typeof source === "array") {
    	for(let key in source) {
    		stringToTokenize += source[key];
    	}
    } else {
    	stringToTokenize = source.toString();
    }

    stringToTokenize += (config.salt || '');

    data.payload = CryptoJS.MD5(stringToTokenize).toString();

    node.send(data);
}