module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.domain = config.domain;
    }
    RED.nodes.registerType("directline-config", register, {
    	credentials: {
            secret:    { type: "text" },
        }
    });
}