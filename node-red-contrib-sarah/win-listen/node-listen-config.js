const helper = require('node-red-viseo-helper');

module.exports = function(RED) {

    RED.nodes.registerType("win-listen-config", function(config){
        RED.nodes.createNode(this, config);
        this.name        = config.name;
        this.setup = () => {
            return  { 
                proc: helper.resolve(config.process),   
                confidence: config.confidence,
                language:   config.language,
                recognizer: config.recognizer,
                hotword:    config.hotword
            }
        }
    }, {});

}