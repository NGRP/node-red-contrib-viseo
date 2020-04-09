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

        start(RED, node, config);
        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("facebook-handover", register, {
        credentials: {
            appDestination: { type: "text" }
        }
    });
}

let SECONDARY_APPS = [];

const start = (RED, node, config) => {

    RED.httpAdmin.get('/facebook/handover/secondary_apps', function(req, res) {
        res.json(SECONDARY_APPS);
    });

    //get APPS
    request(
        {
            method: "GET",
            url: 'https://graph.facebook.com/v6.0/me/secondary_receivers?fields=id,name&access_token=' + node.pageToken.token,
            headers: {'Content-Type': 'application/json'}
        },
        function (err, response, body) { 
            if (err) {
                node.error(err); 
            } else {
                let result = JSON.parse(body);

                if (result.data) {
                    SECONDARY_APPS = result.data;
                }
            }
        }
    );
}

const input = (node, data, config) => {
    

    let userId   = config.userId || 'user.id';
    if (config.userIdType === 'msg') userId = helper.getByString(data, userId);
    let metadata = config.metadata;
    if (config.metadataType === 'msg') metadata = helper.getByString(data, metadata);
    else if (config.metadataType === 'json') metadata = JSON.parse(metadata);
    let secondaryApp = config.credentials.appDestination;


    request ({
            method: "POST",
            url: 'https://graph.facebook.com/v6.0/me/pass_thread_control?access_token=' + node.pageToken.token,
            headers: {'Content-Type': 'application/json'},
            body: {
                recipient : { "id" : userId },
                target_app_id : secondaryApp,
                metadata : metadata
            },
            json: true
        }, function(err, response, body) {

            if (err) {
                node.error(err)
                node.send([undefined, data]);
            }

            try {
                if (body.success) return node.send([data, undefined]);
                else node.error(body.error);
            } catch(ex) {
                node.error(ex)
            }

            node.send([undefined, data]);
        }
    );
}

