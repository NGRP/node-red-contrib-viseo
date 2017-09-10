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
        this.active = config.active;
        start(RED, node, config);
        this.on('input', (data)  => { input(RED, node, data, config)  });
        this.on('close', (done)  => { stop(RED, node, config, done) });
    }
    RED.nodes.registerType("win-sarah", register, {});

    // Register for button callback
    RED.httpAdmin.post("/win-sarah/:id/:state", RED.auth.needsPermission("win-sarah.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                var state = (req.params.state === "enable");
                node.active = state;
                res.sendStatus(state ? 200 : 201);
                node.receive({'state': state}); 
            } catch(err) {
                res.sendStatus(500);
                node.error(RED._("inject.failed",{error:err.toString()}));
            }
        } else { res.sendStatus(404); }
    }); 
}

const stop  = (RED, node, config, done) => { 
    let options = RED.nodes.getNode(config.options);
    listen.kill(options.name);
    if (done) done();
}

const start = (RED, node, config) => {

    if (!config.options) {
        node.status({fill:"red", shape:"ring", text: 'Missing configuration'}); 
    }
    let options = RED.nodes.getNode(config.options);
    let setup   = options.setup()
    setup.grammar = helper.resolve(config.grammar || GRAMMAR);

    listen.start(options.name, setup, (json) => {
        let data = {}
        helper.setByString(data, config.output || 'payload', json);
        node.send(data);
    }, node.warn)
}

const input = (RED, node, data, config) => {
    if (data.state === false){
        stop(RED, node, config)
    } else {
        start(RED, node, config)
    }
}