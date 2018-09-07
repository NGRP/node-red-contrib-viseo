const helper  = require('node-red-viseo-helper');
const request = require('request-promise-native');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("msbot-directline-token", register, {
        credentials : {
            secretKey:    { type: "text" },
        }});
}


const input = async (node, data, config) => {
    
    try {


        let result = await request.post({
            "url": "https://directline.botframework.com/v3/directline/tokens/generate",
            "headers": {
                Authorization : "Bearer "+node.credentials.secretKey
            }
        })

        helper.setByString(data, config.output, JSON.parse(result));

        node.send(data);

    } catch(e) {
        node.error(e);
    }

}