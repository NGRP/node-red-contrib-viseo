const helper    = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("filter", register, {});
}

const input = (node, data, config) => {

    var json = helper.getByString(data, config.src);
    if (!json) return node.send([undefined,data]);

    data.payload = json.filter((item) => {
        return item[config.key] === config.value;
    })

    if (data.payload.length > 0){
        return node.send([data, undefined]);
    }
    node.send([undefined, data]);
}