'use strict'

const request = require('request-promise');
const helper = require('node-red-viseo-helper');

/*
 * Skeleton for ChatbaseApi class
 * Abstract
 */
class ChatbaseApi {

    constructor(node, config, data) {

        if (this.constructor === ChatbaseApi) {
            throw new TypeError('Abstract class "ChatbaseApi" cannot be instantiated directly.'); 
        }

        //configuration
        this.config = node.config

        //user
        let user = config.user || 'user';
        	user = helper.getByString(data, user, user);

        this.userId = user.id

        //intent
        if(config.chatbaseIntentType === 'str') {
        	this.intent = config.chatbaseIntent
        } else if(config.chatbaseIntentType === 'msg') {
        	this.intent = helper.getByString(data, config.chatbaseIntent, config.chatbaseIntent);
        }

    }

    static get url() {
    	throw new TypeError('Url must be defined.'); 
    }

    async send(done) {
    	let data = this._formatData(),
    		url = this.url;

    	try {
    		let result = await request({ uri : url, method: 'POST', body: data });
    		done(null, result);
    	} catch(err) {
    		done(err, null);
    	}
    }

    _formatData() {
    	throw new TypeError('_formatData method must be defined'); 
    }
}

module.exports = ChatbaseApi;
