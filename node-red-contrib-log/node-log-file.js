const helper  = require('node-red-viseo-helper');
const winston = require('winston');
const path    = require('path');

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
    RED.nodes.registerType("log-file", register, {});
}

let logger = undefined;
const setup = (RED, node, config) => {
    let  filepath = helper.resolve(config.file);
    if (!filepath) return;
         filepath = path.normalize(filepath);

    logger = new (winston.Logger)({
        'level': 'info',
        'transports': [
            new (winston.transports.File)({ filename: filepath })
        ]
    })
    node.log('Winston Log File: ' + filepath);
}

const close = (done) => {
    if (logger){ logger = undefined; }
    done();
}

const input = (node, data, config) => {
    let log = config.log || 'payload'; 
        log = helper.getByString(data, log, log);

    if (typeof log === 'object'){
        log = JSON.stringify(log);
        log = log.replace ("\n","");
    }

    logger.log(config.level || 'info', log);
    node.send(data);
}
