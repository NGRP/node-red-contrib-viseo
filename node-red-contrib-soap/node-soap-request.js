'use strict';

const helper  = require('node-red-viseo-helper');
let clients = {};

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);

        let node = this;
        node.status({fill: "red", shape: "dot", text: "Not configured"});
        config.clientConfig = RED.nodes.getNode(config.client);
        if (config.clientConfig.credentials.wsdl) node.status({});
        
        this.on('input', (data)  => { input(RED, node, data, config); });
        this.on('close', (done) => {  stop(node, config, done) });
    }
    RED.nodes.registerType('soap-request', register, {});
};

// ------------------------------------------
// ------------ PROCESS REQUEST -------------
// ------------------------------------------

async function input (RED, node, data, config) {

    let client = clients[config.client]
    if (!client) {
        try { 
            client = await config.clientConfig.startClient(config.clientConfig);
            clients[config.client] = client;
        }
        catch(err) { errorHandler("WSDL error", err, node, data); }
    }

    let output  = config.output || "payload";
    let parameters = (config.parameters) ? helper.getContextValue(RED, node, data, config.parameters || "payload", config.parametersType) : {};
    if (!parameters) return errorHandler("Method error","No method given", node, data)

    let method  = (config.method)  ? helper.getContextValue(RED, node, data, config.method, config.methodType)   : undefined;
    let headers = (config.headers) ? helper.getContextValue(RED, node, data, config.headers, config.headersType) : undefined;

    if (headers) client.addSoapHeader(headers);

    if (client[method]) {
        client[method](parameters, function (err, result) {
            if (err) return errorHandler("Service call error", err, node, data);
            node.status({});
            helper.setByString(data, output, result);
            return node.send([data, undefined]);
        });
    }
    else return errorHandler("Method error", "Method '" + method + "' does not exist", node, data);
};

// ------------------------------------------
// ------------ ERROR HANDLER ---------------
// ------------------------------------------

function errorHandler(display, err, node, data) {
    node.status({fill: "red", shape: "dot", text: display});
    node.error(err);
    if (data) return node.send([undefined, data]);
    return;
}

// ------------------------------------------
// ------------------ STOP ------------------
// ------------------------------------------

function stop(node, config, done) {
    delete clients[config.client];
    return done();
}