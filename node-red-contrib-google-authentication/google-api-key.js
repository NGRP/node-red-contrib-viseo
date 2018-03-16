
module.exports = function(RED) {

    const register = function(config) {
        RED.nodes.createNode(this, config);

        let node = this;

        start(RED, node, config);
    }

    RED.nodes.registerType("google-api-key", register, {
        credentials: {
            key:        { value: undefined }
        }
    });

}


const start = (RED, node, config) => {
};
