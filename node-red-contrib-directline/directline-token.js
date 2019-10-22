const helper  = require('node-red-viseo-helper');
const request = require('request-promise-native');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        node.status({
            fill:"red", shape:"ring", 
            text: "Directline secret missing"
        });
        
        let conf = RED.nodes.getNode(config.config);
        if (conf.credentials && conf.credentials.secret && conf.domain) {
            node.status({});
            config.conf = {
                secret: conf.credentials.secret,
                domain: conf.domain
            }
        }

        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("directline-token", register, {});
}


const input = async (node, data, config) => {

    if (!config.conf || !config.conf.secret) {
        node.error("Directline secret missing");
        return node.send([null, data]);
    }

    let secret = config.conf.secret;
    let domain = config.conf.domain || "https://directline.botframework.com";
    let output = config.output || "payload";
    
    try {
        let result = await request.post({
            "url": domain + "/v3/directline/tokens/generate",
            "headers": {
                Authorization : "Bearer " + secret
            }
        })

        helper.setByString(data, output, JSON.parse(result));
        node.send([data, null]);

    } catch(e) {
        node.error(e);
        return node.send([null, data]);
    }
}