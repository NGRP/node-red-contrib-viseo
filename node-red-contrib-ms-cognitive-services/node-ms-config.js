module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.key = config.key;
    }
    RED.nodes.registerType("ms-config", register, {});
}