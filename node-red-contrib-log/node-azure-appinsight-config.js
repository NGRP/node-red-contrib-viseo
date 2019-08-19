module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);

        this.autoDependencyCorrelation = config.autoDependencyCorrelation;
        this.autoCollectRequests = config.autoCollectRequests;
        this.autoCollectPerformance = config.autoCollectPerformance;
        this.autoCollectExceptions = config.autoCollectExceptions;
        this.autoCollectDependencies = config.autoCollectDependencies;
        this.autoCollectConsole = config.autoCollectConsole;
        this.useDiskRetryCaching = config.useDiskRetryCaching;
        this.sendLiveMetrics = config.sendLiveMetrics;
        this.distributedTracingTracingMode = parseInt(config.distributedTracingTracingMode);
    }
    RED.nodes.registerType('log-azure-appinsight-config', register, {
        credentials: {
            key: { type: 'text' }
        }
    });
};
