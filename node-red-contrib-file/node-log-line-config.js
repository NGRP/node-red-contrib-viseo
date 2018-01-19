module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.fields = config.fields;
        this.separator = config.separator;
        this.separatyp = config.separatyp;
    }
    RED.nodes.registerType("log-line-config", register, {
    	credentials: {
            path:      { type:"text" }
        }
    });
}