module.exports = function(RED) {

    // CREDENTIALS
    RED.nodes.registerType("ethjs-network", function(config){
        RED.nodes.createNode(this, config);
        this.name        = config.name;
        this.url         = config.url;
        this.description = config.description;
    }, {});
}