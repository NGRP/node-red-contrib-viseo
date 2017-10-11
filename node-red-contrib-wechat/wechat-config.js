module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
    }
    RED.nodes.registerType("wechat-config", register, {
    	credentials: {
            id:       { type:"text" },
            secret:   { type:"text" },
            token:    { type:"text" }
        }
    });
}