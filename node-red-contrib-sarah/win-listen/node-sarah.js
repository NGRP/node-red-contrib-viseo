const listen = require('./lib/listen.js');
const helper = require('node-red-viseo-helper');

let GRAMMAR  = process.cwd() + '/data/grammar';

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        start(RED, node, config);
        this.on('close', (done)  => { stop(node, done) });
    }
    RED.nodes.registerType("win-sarah", register, {});
}

const stop  = (node, done) => { 
    listen.kill(node.id);
    done(); 
}

const start = (RED, node, config) => {

    if (!config.options) {
        node.status({fill:"red", shape:"ring", text: 'Missing configuration'}); 
    }
    let options = RED.nodes.getNode(config.options);
    
    let setup   = options.setup()
    setup.grammar = config.grammar || GRAMMAR;

    listen.start(options.name, setup, (json) => {
        let data = {}
        helper.setByString(data, config.output || 'payload', json);
        node.send(data);
    }, node.warn)
}