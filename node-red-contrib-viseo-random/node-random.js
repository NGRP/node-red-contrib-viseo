
// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("random", register, {});
}

const input = (node, data, config) => {
    let out  = new Array(parseInt(config.outputs));
    let rand = Math.round(Math.random() * (out.length-1));

    out[rand] = data;
    node.send(out);
}
