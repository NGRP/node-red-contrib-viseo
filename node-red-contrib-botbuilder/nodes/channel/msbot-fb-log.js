const helper  = require('node-red-viseo-helper');
const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        this.config = RED.nodes.getNode(config.config);
        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("fb-log", register);
}


const input = (node, data, config) => {
    
    let appId        = node.config.credentials.appId;
    let pageId       = node.config.credentials.pageId;

    let userId       = config.userId || 'user.id';
        userId       = helper.getByString(data, userId, userId);

    let eventLog     = config.log || 'payload';
        eventLog     = helper.getByString(data, eventLog, eventLog);

    sendCustomEvent(appId, pageId, userId, eventLog, (err, body) => {
        if (err) return node.error(err);
        node.log(body);
    })

    node.send(data);
}

const sendCustomEvent = (appId, pageId, userId, eventLog, callback) => {
    let url = 'https://graph.facebook.com/' + appId + '/activities';

    request({ 
        'url': url,'method': 'POST',
        'form': {
            'event': 'CUSTOM_APP_EVENTS',
            'custom_events': JSON.stringify([eventLog]),
            'advertiser_tracking_enabled': 0,
            'application_tracking_enabled': 0,
            'extinfo': JSON.stringify(['mb1']),
            'page_id': pageId,
            'page_scoped_user_id': userId
        }
    },  function (err, response, body) { 
        if (err) return callback(err);
        callback(undefined, body);
    });
}