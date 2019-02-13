const helper  = require('node-red-viseo-helper');
const request = require('request-promise');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    function register(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("blink", register, {
        credentials: {
            login:     { type:"text"      },
            password:  { type:"password"  }
        }
    });
}

async function input (node, data, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    let action = config.action || "login";

    let uri = config.uri || "https://rest.prde.immedia-semi.com";
    let req = { uri: uri }

    if (config.uriType === "msg") req.uri = helper.getByString(data, uri);

    if (action === "login") {
        let login = node.credentials.login;
        let password = node.credentials.password;

        if (!login || !password) {
            node.status({fill:"red", shape:"ring", text: 'Missing credentials'});
            return node.send(data);
        }

        req.uri += '/login'
        req.method = "POST";
        req.json = true;
        req.form = {
            email : login,
            password: password,
            client_specifier: "iPhone 9.2 | 2.2 | 222"
        }
    }

    else {
        let token = config.token;
        let api = config.api;

        if (config.tokenType === "msg") token = helper.getByString(data, token);
        if (!token) {
            node.status({fill:"red", shape:"ring", text: 'Missing credentials'});
            return node.send(data);
        }

        req.headers = { TOKEN_AUTH: token };
        if (action.match(/arm/)) {
            req.method = "POST"; req.json = true; req.form = {};
        }
        else {
            req.method = "GET";
        }

        if (action === "get_media") {
            let mediaUrl = config.mediaUrl;
            if (config.mediaUrlType === "msg") mediaUrl = helper.getByString(data, mediaUrl);
            req.uri += mediaUrl;
            req.encoding = null;
        }
        else if (action === "homescreen") req.uri += "/homescreen";
        else if (action === "networks") req.uri += "/networks";
        else if (api === "network" || action === "command" || action === "programs") {
            let networkId = config.networkId;
            if (config.networkIdType === "msg") networkId = helper.getByString(data, networkId);
            req.uri += "/network/" + networkId + '/' + action;
        }
        else if (action === "command") {
            let commandId = config.commandId;
            if (config.commandIdType === "msg") commandId = helper.getByString(data, commandId);
            req.uri += "/" + commandId;
        }
        else if (action === "events") {
            let networkId = config.networkId;
            if (config.networkIdType === "msg") networkId = helper.getByString(data, networkId);
            req.uri += "/events/network/" + networkId;
        }
        else if (api === "events" || api === "cameras") {
            let networkId = config.networkId;
            if (config.networkIdType === "msg") networkId = helper.getByString(data, networkId);
            req.uri += "/network/" + networkId;

            if (action === "info_allcameras") req.uri += '/cameras';
            else {
                let cameraId = config.cameraId;
                if (config.cameraIdType === "msg")  cameraId = helper.getByString(data, cameraId);
                req.uri += '/camera/' + cameraId;
                if (action !== "info_camera")  req.uri += "/" + action
            }
        }
        else if (action === "info_video" || action === "delete_video") {
            let videoId = config.videoId;
            if (config.videoIdType === "msg") videoId = helper.getByString(data, videoId);
            req.uri += "/api/v2/video/" + videoId;
            if (action === "delete_video") req.url += "/delete"
        }
        else if (api === "video") {
            req.uri += "/api/v2/videos/" + action;
        }
        else req.uri += "/" + action
    }   

    try {
        let result = await request(req);
        if (action === "get_media") {
            
            let destination = config.destination || "{cwd}";
            let buffer = Buffer.from(result, 'utf8');
            result = {
                uri: req.uri,
                destination: "none"
            }

            if (config.destinationType === "msg") destination = helper.getByString(data, destination);
            if (destination) {
                destination = helper.resolve(destination, data, '');
                destination = path.normalize(destination);

                try {
                    let stat = fs.lstatSync(destination); 
                    if (stat.isDirectory()) {
                        let filename = req.uri.split('/').pop();
                        destination = path.join(destination, filename);
                    }
                }
                catch(err) {
                    node.warn(destination);
                    return node.error(err);
                }

                // is Directory
    
                let outVideo = fs.createWriteStream( destination );
                    outVideo.write( buffer, "binary" );
                    outVideo.end();
            }
        }
        else if (typeof result === "string") result = JSON.parse(result)
        helper.setByString(data, config.output || "payload", result);
        return node.send(data);
    }
    catch(err) {
        node.warn(req);
        return node.error(err);
    }
}