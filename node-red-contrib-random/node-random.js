
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
    RED.nodes.registerType("random", register, {});
}

const input = (node, data, config) => {
    let out  = new Array(parseInt(config.outputs));
    let rand = Math.round(Math.random() * (out.length-1));

    if (config.once){
        let order = helper.getByString(data, config.once, undefined);
        if (!order || order.length <= 0){ order = [];
            for(let i=0; i < config.outputs ; i++){ order.push(i); }
            shuffle(order);
            helper.setByString(data, config.once, order);
        }
        rand = order.pop();
    }

    out[rand] = data;
    node.send(out);
}

const shuffle = (a) => {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}