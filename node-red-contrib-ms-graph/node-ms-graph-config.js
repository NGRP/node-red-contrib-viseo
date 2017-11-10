module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
    }
    RED.nodes.registerType("ms-graph-config", register, {
    	credentials: {
            clientid:      { type:"text" },
            clientsecret:  { type:"text" }
        }
    });
}