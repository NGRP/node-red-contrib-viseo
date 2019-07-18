// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("repeat-card", register, {});
}


const input = (RED, node, data, config) => {

    if (data._replyid && data.reply) {
        let targetNode = RED.nodes.getNode(data._replyid);
        if (targetNode.type === 'send-card' && targetNode.repeat) {
            targetNode.repeat(data, data.reply);
        }
    }
    node.send(data);

}