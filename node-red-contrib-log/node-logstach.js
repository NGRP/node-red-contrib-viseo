const helper  = require('node-red-viseo-helper');
const Logstash = require('logstash-client');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        setup(RED, node, config);
        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("logstach", register, {});
}

// See: https://github.com/purposeindustries/node-logstash-client


let logstash = undefined;
const setup = (RED, node, config) => {
    logstash = new Logstash({
        'type': config.protocol, // udp, tcp, memory
        'host': config.host,
        'port': parseInt(config.port)
    });
}

const input = (node, data, config) => {
    let log = config.log || 'payload';
    log = helper.getByString(data, log, log);

    logstash.send(log);
    node.send(data);
}
