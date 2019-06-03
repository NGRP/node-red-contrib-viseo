module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.rest_endpoint = config.rest_endpoint;
        this.graphql_endpoint = config.graphql_endpoint;
    }
    RED.nodes.registerType("iadvize-config", register, {
    	credentials: {
            rest:    { type: "text" },
            graphql:    { type: "text" }
        }
    });
}