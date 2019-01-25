
const helper =  require('node-red-viseo-helper');
const request = require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.status({fill:"red", shape:"ring", text: 'Missing credential'})
        if (config.auth) {
            node.auth = RED.nodes.getNode(config.auth);
            node.status({});
        }

        this.on('input', (data)  => { input(RED, node, data, config,) });
    }
    RED.nodes.registerType("google-actions", register, {});
}

function input (RED, node, data, config) {
    // action
    let action = config.action;
      
    try {
        node.auth.authenticate((auth) => {
            if (auth) {
                if (action === 'token') {
                    helper.setByString(data, config.output || "payload", auth.credentials);
                    return node.send(data);
                }
                else {
                    // input
                    let input = helper.getContextValue(RED, node, data, config.input, config.inputType);
                    if (input.customPushMessage) input = input.customPushMessage;
                    if (!input.orderUpdate)      input = { orderUpdate: input };

                    send(auth, input)
                    .then( function (res) {
                        helper.setByString(data, config.output || "payload", res);
                        return node.send(data);
                    })
                    .catch(function (err) {
                        return node.error(err); 
                    })
                }
            }
            return node.send(data);
        })
    } catch (ex){ console.log(ex); }
}

function send(auth, content, cb) {

    let req = {
        uri: "https://actions.googleapis.com/v2/conversations:send/",
        method: 'POST',
        body: {
            customPushMessage: content
        },
        headers: {  
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + auth.credentials["access_token"]
        },
        json:true
    }

    return request(req);
}