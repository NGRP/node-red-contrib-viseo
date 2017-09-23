const helper   = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

let CACHE = {};

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        setup(RED, node, config);
        this.on('close', (done) => { close(node, done) });
    }
    RED.nodes.registerType("bot-event", register, {});
}

const setup  = (RED, node, config) => { 
    CACHE[node.id] = CACHE[node.id] || {};
    let listen = CACHE[node.id].listen = config.listen;
    if (!listen) return;

    let listener = CACHE[node.id].listener = (srcNode, data, config) => { 
        node.send(data);
    }
    helper.listenEvent(listen, listener)
}

const close = (node, done) => { 
    CACHE[node.id] = CACHE[node.id] || {};
    if (!CACHE[node.id].listener){ done(); }

    helper.removeListener(CACHE[node.id].listen, CACHE[node.id].listener);
    CACHE[node.id].listen   = undefined;
    CACHE[node.id].listener = undefined;
    done();
}
