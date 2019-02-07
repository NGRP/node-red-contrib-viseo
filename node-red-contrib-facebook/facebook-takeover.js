const helper  = require('node-red-viseo-helper');
const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.status({fill:"red", shape:"ring", text: 'Missing credential'});
        node.pageToken = RED.nodes.getCredentials(config.pageToken);
        if (node.pageToken && node.pageToken.token) node.status({});

        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("facebook-takeover", register);
}


const input = (node, data, config) => {
    
    let userId   = config.userId || 'user.id';
    if (config.userIdType === 'msg') userId = helper.getByString(data, userId);
    let metadata = config.metadata;
    if (config.metadataType === 'msg') metadata = helper.getByString(data, metadata);
    else if (config.metadataType === 'json') metadata = JSON.parse(metadata);

    request({
            method: "POST",
            url: 'https://graph.facebook.com/v2.6/me/take_thread_control?access_token='+ node.pageToken.token,
            headers: {'Content-Type': 'application/json'},
            body: {
                recipient : { "id" : userId },
                metadata : metadata
            },
            json: true
        }, 
        function(err, response, body) {
            if (err) {
                node.error(err)
                data.error = err.message;
                node.send([undefined, data]);
            }

            try {
                if (body.success) return node.send([data, undefined]);
                else node.error(body.error);
            } catch (ex) {
                node.error(ex)
                data.error = ex.message;
            }

            node.send([undefined, data]);
        }
    );
}

