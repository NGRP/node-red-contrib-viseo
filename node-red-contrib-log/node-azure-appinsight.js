const helper = require('node-red-viseo-helper');
const appInsights = require('applicationinsights');
const { DefaultAzureCredential, ClientSecretCredential  } = require('@azure/identity');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

let client;

const setup = (config) => {
    appInsights.setup(config.credentials.connectionString)
        .setAutoDependencyCorrelation(config.autoDependencyCorrelation || false)
        .setAutoCollectRequests(config.autoCollectRequests || false)
        .setAutoCollectPerformance(config.autoCollectPerformance || false)
        .setAutoCollectExceptions(config.autoCollectExceptions || false)
        .setAutoCollectDependencies(config.autoCollectDependencies || false)
        .setAutoCollectConsole(config.autoCollectConsole || false, true)
        .setUseDiskRetryCaching(config.useDiskRetryCaching || false)
        .setSendLiveMetrics(config.sendLiveMetrics || false)
        .setDistributedTracingMode(config.distributedTracingTracingMode || appInsights.DistributedTracingModes.AI)
        .start();
    
    if (config.useADAuthentication) {
        const credential = config.authenticationType === 'managedIdentity' ?
            new DefaultAzureCredential() :
            new ClientSecretCredential(
                config.tenantId,
                config.clientId,
                config.credentials.clientSecret
            );
        appInsights.defaultClient.config.aadTokenCredential = credential;
    }

    client = appInsights.defaultClient;
};

const close = (done) => {
    if (client) {
        client.flush();
        appInsights.dispose();
        client = undefined;
    }
    done();
};

// See https://github.com/Microsoft/ApplicationInsights-node.js/tree/master
const input = (node, data, config) => {
    if (client) {
        let log = config.log || 'payload';
        if (config.logType === 'msg') log = helper.getByString(data, log);
        const name = (config.evtnameType === 'msg') ? helper.getByString(data, config.evtname) : config.evtname;
        const type = config.evttype || 'event';

        if (type === 'event') {
            client.trackEvent({ name, properties: log });
        } else if (type === 'metric') {
            client.trackMetric({ name, value: parseInt(log) });
        } else if (type === 'trace') {
            client.trackTrace({ message: log });
        } else if (type === 'error') {
            client.trackException({ exception: new Error(log) });
        }
    }

    node.send(data);
};

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.configuration);
        
        if (!conf) {
            node.status({ fill: 'red', shape: 'ring', text: 'Missing configuration' });
        }

        if (!conf || !conf.credentials.connectionString) return;

        setup(conf);
        this.on('input', (data) => { input(node, data, config); });
        this.on('close', (done) => { close(done); });
    }
    RED.nodes.registerType('log-azure-appinsight', register, {});
};
