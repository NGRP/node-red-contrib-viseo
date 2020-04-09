const helper  = require('node-red-viseo-helper');
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

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        node.pageToken = RED.nodes.getCredentials(config.pageToken);
        if (node.pageToken && node.pageToken.token) node.status({});

        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("facebook-profile", register, {});
}

const generateLogObject = (user) => {
    return {
        facebookId: user.id,
        lastSeen: user.mdate
    };
};

const input = (node, data, config) => {

    let userField = config.field;
    let sourceField = config.source;

    if (config.sourceType === "msg") sourceField = helper.getByString(data, sourceField);
    if (sourceField !== "facebook" && sourceField !== "messenger") return node.send(data);
    
    let user = helper.getByString(data, userField);
    if (!user || !user.id) return node.send(data);

    // Has a Facebook profile
    user.profile = user.profile || {};
    data.log = { user: Object.assign({}, generateLogObject(user)) };

    let now = new Date().getTime();
    if (user.fbmdate && now - user.fbmdate < THRESHOLD) return node.send(data);

    getFBProfile(user.id, node.pageToken.token, (json) => {
        if (!json) return node.send(data); 
        node.log('Update Facebook profile: ' + user.id);

        extend(true, user.profile, json);
        user.fbmdate = Date.now();
        data.log = { user: Object.assign({}, generateLogObject(user)) };
        helper.setByString(data, userField, user);
        node.send(data); 
    })
}

// --------------------------------------------------------------------------
//  FACEBOOK API
// --------------------------------------------------------------------------

const URL = "https://graph.facebook.com/v6.0/";
const QS  = "?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=";

const getFBProfile = exports.getUserProfile = (uid, token, callback) => {

    if (!uid || !token) {
        node.warn("Missing informaion")
        return callback();
    }

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
