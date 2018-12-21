module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.rules = config.rules;
    }
    RED.nodes.registerType("credentials-config", register, {
    	credentials: { rules_to: {type: "text"}}
    });
}