module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
    }
    RED.nodes.registerType("dialogflow-config", register, {
    	credentials: {
            clienttoken:    { type:"text" },
            devtoken:       { type:"text" }
        }
    });
}