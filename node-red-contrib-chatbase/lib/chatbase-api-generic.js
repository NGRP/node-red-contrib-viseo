'use strict'

const moment = require('moment');
const helper = require('node-red-viseo-helper');
const ChatbaseApi = require('./chatbase-api.js');

class ChatbaseApiGeneric extends ChatbaseApi {

    constructor(node, config, data) {

        super(node, config, data);

        this.type = config.chatbaseSender;

        if(config.messageType === 'str') {
            this.message = config.message;
        } else {
            this.message = helper.getByString(data, config.message, config.message);
        }

        this.not_handled = config.notHandled;

    }

    static get url() {
    	return 'https://chatbase.com/api/message'
    }

    _formatData() {

        let data = {
            "type": this.type,
            "time_stamp": moment().valueOf(),
            "message": this.message,

            'version' : this.config.version,
            'platform' : this.config.platform,
            'api_key': this.config.credentials.token,
            'user_id': this.userId
        }


        if(this.type === 'user') {
            if(this.not_handled) { //we didn't recognize the intent
                data.not_handled = true;
            } else { //we recognized the intent
                data.intent = this.intent
            }
        }
        return data
    }
}

module.exports = ChatbaseApiGeneric;
