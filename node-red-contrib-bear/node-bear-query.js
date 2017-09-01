const request = require('request');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        if (!config.key) {node.status({fill:"red", shape:"ring", text: 'Missing credential'}); }
        let key = RED.nodes.getNode(config.key);
        
        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config, key.credentials)  });
        this.on('close', (done)  => { stop(done) });
    }
    RED.nodes.registerType("bear-query", register, {});
}

const stop   = (done) => { done(); }
const start  = (RED, node, config) => { }
const input  = (node, data, config, credentials) => {
    
    let url      = 'http://api.bear2b.com/reco'
    let formData = { image: {
        value: helper.getByString(data, config.input || 'payload'),
        options: {
            filename: 'viseo-bot-'+ Date.now(),
        }
    }}

    let method   = 'POST'
    let b64      = new Buffer(credentials.username + ":" + credentials.password).toString("base64");
    let headers  = { "Authorization" : ("Basic " + b64) }
    let req      = { url, headers, method, formData  }
    
    request(req, (err, response, body) => {
        if (err) { return node.error(err); }
        try {
            helper.setByString(data, config.output || 'payload', JSON.parse(body));
            node.send(data);
        } catch(ex){ node.warn(ex); }
    });
}
