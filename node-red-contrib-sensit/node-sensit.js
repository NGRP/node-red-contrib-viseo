var Sensit = require("node-sensit");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("sensit", register, {});
}

const input = (node, data, config) => {
    
    var sensit = new Sensit(config.token);
    sensit.getSensor(config.device, config.sensor).then(function (json) {
        data.payload = json;
        node.send(data);
    }).fail(function (json) {
        console.log('Error!');
        node.send(data);
    });

    
}
    