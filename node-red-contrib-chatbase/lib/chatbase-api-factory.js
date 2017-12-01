'use strict'


const ChatbaseApiGeneric = require('./chatbase-api-generic.js');
const ChatbaseApiCustom = require('./chatbase-api-custom.js');



class ChatbaseApiFactory {
	
	constructor() {

	}

	createApi(node, config, data) {
		if(config.chatbaseType === 'generic') {
			return new ChatbaseApiGeneric(node, config, data);
		} else if(config.chatbaseType === 'custom') {
			return new ChatbaseApiCustom(node, config, data);
		}

		return null;
	}
}

module.exports =  new ChatbaseApiFactory();