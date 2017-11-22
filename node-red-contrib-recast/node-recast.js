
const helper   = require('node-red-viseo-helper');
const recastai = require('recastai')


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        start(node, RED, config);
        this.on('input', (data)  => { input(node, data, config) });
        this.on('close', (cb)    => { stop(node, cb, config)    });
    }   
    RED.nodes.registerType("node-recast", register, {});
}

let client   = undefined;
const stop   = (node, callback, config) => {  
    client = undefined;
    callback(); 
}
const start  = (node, RED, config) => {
    try {
        console.log(config.key);
    let key = RED.nodes.getNode(config.key);
    if (!key){
        return node.status({fill:"red", shape:"ring", text: 'Missing credentials'});
    }

    client = new recastai.request(key.credentials.token, key.lang)
    node.status({});
    } catch (ex){ console.log(ex); }
}

const input = (node, data, config) => {
    if (client === undefined) return node.send(data);

    let text = helper.getByString(data, config.input || 'payload')
    if (!text){ return node.send(data); }

    client.analyseText(text)
        .then(function(res) {
            let intent = res.intent()
            helper.setByString(data, config.output || 'payload', intent)
            node.send(data);
        }).catch(function(err) { node.warn(err) })
}
