const request = require('request');
const extend  = require('extend');
const THRESHOLD = 1000 * 60 * 60 * 4;

// --------------------------------------------------------------------------
//  LOGS
// --------------------------------------------------------------------------

let info  = console.log;
let error = console.log;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    info  = RED.log.info;
    error = RED.log.error;

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.config = RED.nodes.getNode(config.config);

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("fb-profile", register, {});
}

const generateLogObject = (user) => {
    return {
        facebookId: user.id,
        lastSeen: user.mdate
    };
};

const input = (node, data, config) => {
    if (undefined === data.user) return node.send(data);
    let user  = data.user;
    let inMsg = data.message;

    // Not a Facebook profile
    if ('facebook' !== inMsg.source){ 
        return node.send(data); 
    }
    
    // Has a Facebook profile
    user.profile = user.profile || {};
    data.log = { user: Object.assign({}, generateLogObject(user)) };

    let now = new Date().getTime();
    if (user.fbmdate && now - user.fbmdate < THRESHOLD){
        return node.send(data);
    }

    getFBProfile(node, user.id, config, (json) => {
        node.log('Update Facebook profile: ' + user.id);
        if (undefined === json) return node.send(data); 
        extend(true, user.profile, json);
        user.fbmdate = Date.now();
        data.log = { user: Object.assign({}, generateLogObject(user)) };
        node.send(data); 
    })
}

// --------------------------------------------------------------------------
//  FACEBOOK API
// --------------------------------------------------------------------------

const getPageToken = (node) => {
    
    if (CONFIG && CONFIG.facebook && CONFIG.facebook.pageToken)
        return CONFIG.facebook.pageToken;

    return node.config.credentials.token;

}

const URL = "https://graph.facebook.com/v2.8/";
const QS  = "?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=";

const getFBProfile = exports.getUserProfile = (node, uid, config, callback) => {
    if (undefined === uid) return callback();

    let token = getPageToken(node);
    if (!token) return callback();

    let url = URL + uid + QS + token;
    request(url, (err, response, body) => {
        if (err || response.statusCode !== 200) {
            if(err) {
                error(err);
            } else {
                error("Unexpected Facebook profile response code : "+response.statusCode);
            }
            return callback();
        }
        let json = JSON.parse(body);
        callback(json);
    })
}
