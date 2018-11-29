const helper  = require('node-red-viseo-helper');
const appInsights = require("applicationinsights");

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        setup(RED, node, config);
        this.on('input', (data) => { input(node, data, config)  });
        this.on('close', (done) => { close(done) });
    }
    RED.nodes.registerType("log-azure-appinsight", register, {});
}


let client = undefined;
const setup = (RED, node, config) => {
    if (!config.key) return;
    appInsights.setup(config.key) 
               .setAutoCollectRequests(false)
               .setAutoCollectPerformance(false)
               .setAutoCollectExceptions(false)
               .start();
    client = appInsights.getClient(config.key);
}

const close = (done) => {
    appInsights.stop();
    client = undefined;
    done();
}

// See https://github.com/Microsoft/ApplicationInsights-node.js/tree/master
const input = (node, data, config) => {

    let log =  config.log || "payload";
    if (config.logType === "msg") log = helper.getByString(data, log) ;
    let name = (config.evtnameType === "msg") ?  helper.getByString(data, config.evtname) : config.evtname;
    let type = config.evttype || 'event';

    if (type === 'event'){
        client.trackEvent(name, log);
    } else if (type === 'metric'){
        client.trackMetric(name, parseInt(log));
    } else if (type === 'trace'){
        client.trackTrace(log);
    } else if (type === 'error'){
        client.trackException(new Error(log));
    }

    node.send(data);
}
