module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
    }
    RED.nodes.registerType("aws-config", register, {
    	credentials: {
            accessKeyId:     { type:"text" },
            secretAccessKey: { type:"text" },
            region:          { type:"text" }
        }
    });
}