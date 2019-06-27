const { NlpManager } = require('node-nlp');

module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);

        this.name = config.name;
        this.file = config.file || "./model.nlp";
        this.manager = new NlpManager();

    }
    RED.nodes.registerType("nlp-js-config", register, {});
}