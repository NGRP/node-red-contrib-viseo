
const request = require('request-promise');
const helper = require('node-red-viseo-helper');
const xml2js = require("xml2js");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    
    const register = function(config) {
        
        RED.nodes.createNode(this, config);
        let node = this;

        start(RED, node, config);

        this.on('input', (data) => { input(node, data, config)  });

        //this.on('close', close);
    }

    RED.nodes.registerType("node-omniture-insertion", register);
}


const start = (RED, node, config) => {

    node.application = RED.nodes.getNode(config.application);

}

const input = async (node, data, config) => {

    let accessToken;

    if(node.accessToken) {
        if(node.expires >= Date.now()) {
            accessToken = node.accessToken;
        }
    }

    if(!accessToken) {
        try {

            let result = JSON.parse(await request.post({
                url : 'http://api.omniture.com/token',
                headers: {
                    Authorization: "Basic "+Buffer.from(node.application.credentials.applicationId+":"+node.application.credentials.applicationSecret).toString('base64')
                },
                form: {
                    grant_type: "client_credentials"
                }
            }))

            node.accessToken = result.access_token;
            node.expires = Date.now() + result.expires_in;
            accessToken = node.accessToken;

        } catch(e) {
            node.error(e);
            return node.send(data);
        }
    }
    
    try {
        //use xml to js
        let url = node.application.url;
        let log = helper.getByString(data, config.data, "");

        let builder = new xml2js.Builder();
        let xml = builder.buildObject(log);

        let result = await request.post({
            url : url,
            form : xml,
            headers: {
                Authorization: "Bearer "+accessToken
            }
        })

        xml2js.parseString(result, (err, xmlresult) => {
            
            if(xmlresult.status !== "SUCCESS") {
                node.error(result);
            }

            node.send(data);
        })
        

    } catch(e) {
        node.error(e);
        node.send(data);
    }
}
    

const close = (node, data, config) => {

}
