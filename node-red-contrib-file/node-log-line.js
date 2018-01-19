
const helper = require('node-red-viseo-helper');
const path   = require('path');
const fs     = require('fs');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let conf = RED.nodes.getNode(config.config);
        config.path = conf.credentials.path;
        config.template = conf.fields;
        config.separate = conf.separator;
        config.sepatype = conf.separatyp;
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  })
    }
    RED.nodes.registerType("log-line", register, {})
}

const input = (node, data, config) => {
    
    // Ensure output path
    let logpath = path.normalize(config.path);
    helper.mkpathsync(path.dirname(logpath));

    let separate = (config.sepatype === 'str') ? config.separate : ' ',
        logstr = "",
        nb = 0;

    for (let temp of config.template) {
        switch(temp.typed) {
            case 'date':
                logstr += String(Date.now()) + separate;
                break;
            case 'option_date':
                logstr += (new Date()).toISOString() + separate;
                break;
            case 'option_carr':
                logstr += data.user.address.carrier + separate;
                break;
            case 'option_conv':
                logstr += data.user.address.conversation.id + separate;
                break;
            case 'option_userid':
                logstr += data.user.id + separate;
                break;
            case 'option_userna':
                logstr += data.user.name + separate;
                break;
            case 'str':
                let cont = config.content[nb];
                logstr += (cont.typed === 'msg') ? helper.getByString(data, cont.value) : cont.value;
                logstr += separate ;
                nb++;
        }
    }

    // Write to logfile
    logstr = logstr.substring(0, logstr.length - separate.length) + '\n';
    var stream = fs.createWriteStream(logpath, {flags:'a'});
    stream.write(logstr);
    stream.end();

    return node.send(data);
}