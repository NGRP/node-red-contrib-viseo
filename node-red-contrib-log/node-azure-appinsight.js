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

    let log  = config.log || 'payload';
        log  = helper.getByString(data, log, log);
    let name = helper.resolve(config.evtname, data, config.evtname);
    let type = helper.resolve(config.evttype, data, config.evttype);

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
