module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
    }
    RED.nodes.registerType("salesforce-config", register, {
    	credentials: {
            id:       { type:"text" },
            secret:   { type:"text" },
            instance: { type:"text" },
            refresh:  { type:"text" }
        }
    });
}