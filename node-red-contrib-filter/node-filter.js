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
    console.log('>>> src ', config.src)
try {
    var json = helper.getByString(data, config.src);
    if (!json) return node.send(data);
    }catch(ex){console.log(ex)}

    console.log(config.key, config.value, json);
    data.payload = json.filter((item) => {
        return item[config.key] === config.value;
    })
    
    node.send(data);
}