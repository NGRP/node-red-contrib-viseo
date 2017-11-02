module.exports = function(RED) {

    // CREDENTIALS
    RED.nodes.registerType("ethjs-contract", function(config){
        RED.nodes.createNode(this, config);
        this.name        = config.name;
        this.address     = config.address;
        this.transaction = config.transaction;
        this.abi         = config.abi;
        this.bin         = config.bin;
    }, {});
}