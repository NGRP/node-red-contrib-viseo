module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name  = config.name;
        this.key   = config.key;
        this.token = config.token;
    }
    RED.nodes.registerType("trello-config", register, {});
}