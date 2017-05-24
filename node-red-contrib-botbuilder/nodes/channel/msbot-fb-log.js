const helper  = require('node-red-viseo-helper');
const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("fb-log", register, {});
}


const input = (node, data, config) => {
    
    let clientId     = helper.resolve(config.clientId,  data, config.clientId);
    let clientSecret = helper.resolve(config.clientSecret, data, config.clientSecret);

    let appId        = helper.resolve(config.appId,  data, config.appId);
    let pageId       = helper.resolve(config.pageId, data, config.pageId);
    let userId       = helper.resolve(config.userId, data, config.userId);

    let eventLog     = config.log || 'payload';
        eventLog     = helper.getByString(data, eventLog, eventLog);

    getAccessToken(clientId, clientSecret, (err, access_token) => {
        if (err) return node.error(err);

        sendCustomEvent(appId, pageId, userId, access_token, eventLog, (err, body) => {
            if (err) return node.error(err);
            node.log(body);
        })
    })

    node.send(data);
}


const FB_URL_ACCESS = 'https://graph.facebook.com/oauth/access_token?'
const getAccessToken = (client_id, client_secret, callback) => {
    request({
        'url' : FB_URL_ACCESS + 'client_id=' + client_id + '&client_secret=' + client_secret + '&grant_type=client_credentials'
    }, function (err, response, body) { 
        if (err) return callback(err);
        callback(undefined, body.substring(13)); //access_token=
    })
}

const sendCustomEvent = (appId, pageId, userId, access_token, eventLog, callback) => {
    let url = 'https://graph.facebook.com/' + appId + '/activities?access_token='+access_token;

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