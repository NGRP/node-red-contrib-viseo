'use strict'

const helper = require('node-red-viseo-helper');
const ChatbaseApi = require('./chatbase-api.js');

class ChatbaseApiCustom extends ChatbaseApi {

    constructor(node, config, data) {

        super(node, config, data);

        this.properties = []

        for(let property of config.properties) {

            let propertyToPush = { property_name : property.n };
            let propertyType = 'string_value';
            let propertyValue = property.v;

            if(property.vt === 'bool') {
                propertyType = 'bool_value';
            } else if(property.vt === 'num') {
                propertyType = this._typeFromValue(property.v);
            } else if(property.vt === 'msg') {
                propertyValue = helper.getByString(data, property.v);
                propertyType = this._typeFromValue(propertyValue);
            }

            propertyToPush[propertyType] = this._cast(propertyType, propertyValue)

            this.properties.push(propertyToPush)

        }

    }

    _typeFromValue(value) {
        if(typeof value === 'boolean') {
            return 'bool_value';
        }

        let number = Number(value);

        if(Number.isNaN(number) || number.toString() !== value.toString()) {

            return 'string_value';
        }
        if(Number.isInteger(number)) {
            return 'integer_value';
        }
        return 'float_value';
    }

    _cast(type, value) {
        switch(type) {
          case 'bool_value':
            return Boolean(value);
          case 'integer_value':
          case 'float_value':
            return Number(value);
        }
        return value
    }

    static get url() {
    	return 'https://api.chatbase.com/apis/v1/events/insert'
    }

    _formatData() {

        let data = {
            'intent': this.intent,
            'properties': this.properties,

            'version' : this.config.version,
            'platform' : this.platform,
            'user_id': this.userId,
            'api_key': this.config.credentials.token
        }

        return data
    }
}
module.exports = ChatbaseApiCustom;

