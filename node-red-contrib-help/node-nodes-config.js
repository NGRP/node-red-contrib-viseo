module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.url = config.url;
        this.usernameType = config.usernameType;
        this.passwordType = config.passwordType;
        this.tokenType =    config.tokenType;
    }
    RED.nodes.registerType("nodes-config", register, {
    	credentials: {
            password:    { type:"password" },
            username:    { type:"text" },
            token:       { type:"text" }
        }
    });
}