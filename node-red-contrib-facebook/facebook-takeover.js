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

        start(RED, node, config);

        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("facebook-takeover", register);
}


const start = (RED, node, config) => {

}

const input = (node, data, config) => {
    

    let userId       = config.userId || 'user.id';
        userId       = helper.getByString(data, userId, userId);

    let metadata     = config.metadata;


    request(
        {
            method: "POST",
            url: 'https://graph.facebook.com/v2.6/me/take_thread_control?access_token='+node.config.credentials.token,
            headers: {'Content-Type': 'application/json'},
            body: {
                recipient : { "id" : userId },
                metadata : metadata
            },
            json: true
        }, function(err, response, body) {


            if(err) {
                node.error(err)
                node.send([undefined, data]);
            }

            try {
                if(body.success) {
                    return node.send([data, undefined]);
                } else {
                    node.error(body.error);
                }
            } catch(ex) {
                node.error(ex)
            }

            node.send([undefined, data]);
        }
    );


}

