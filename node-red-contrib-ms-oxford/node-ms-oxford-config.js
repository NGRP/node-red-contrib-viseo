module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.appId = config.appId.trim();
        this.appKey = config.appKey.trim();
    }
    RED.nodes.registerType("ms-oxford-config", register, {});
}