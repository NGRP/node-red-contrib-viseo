module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.token = config.token;
        this.appId = config.appId;
        this.pageId = config.pageId;
    }
    RED.nodes.registerType("facebook-config", register, {});
}