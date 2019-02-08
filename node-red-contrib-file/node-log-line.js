
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
        config.endFileName = conf.add;
        config.keepFiles = conf.keep;
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  })
    }
    RED.nodes.registerType("log-line", register, {})
}

encapsulate = function(strToEncapsulate) {
    if (!strToEncapsulate) {
      return "";
    }
  	return strToEncapsulate.replace(/"/g, '""');
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
                logstr += '"' + encapsulate(String(Date.now())) + '"' + separate;
                break;
            case 'option_date':
                logstr += '"' + encapsulate((new Date()).toISOString()) + '"' + separate;
                break;
            case 'option_carr':
                logstr += '"' + encapsulate(data.user.address.carrier) + '"' + separate;
                break;
            case 'option_conv':
                logstr += '"' + encapsulate(data.user.address.conversation.id) + '"' + separate;
                break;
            case 'option_userid':
                logstr += '"' + encapsulate(data.user.id) + '"' + separate;
                break;
            case 'option_userna':
                logstr += '"' + encapsulate(data.user.name) + '"' + separate;
                break;
            case 'str':
                let cont = config.content[nb];
                logstr += '"';
                logstr += encapsulate((cont.typed === 'msg') ? helper.getByString(data, cont.value) : cont.value);
                logstr += '"' + separate ;
                nb++;
        }
    }

    var fPath = logpath;
    if (config.endFileName) {
        var index = logpath.lastIndexOf('.');
        var date = (new Date()).toISOString();
        fPath = logpath.slice(0, index) + '-' + date.substring(0,10) + logpath.slice(index);
    }

    // Write to logfile
    logstr = logstr.substring(0, logstr.length - separate.length) + '\n';
    var stream = fs.createWriteStream(fPath, {flags:'a'});
    stream.write(logstr);
    stream.end();

    // Delete old files if needed
    if (config.endFileName && config.keepFiles) {
        var folder = path.dirname(logpath);
        var files = [];

        fs.readdir(folder, function(err, items) {
            if (err) {
                node.warn("Can not delete old files.");
                return node.send(data);
            }
            logpath = path.basename(logpath);
            var index = logpath.lastIndexOf('.');
            var files = [];
            var regex = new RegExp( logpath.slice(0, index) + '-[0-9]{4}-[0-9]{2}-[0-9]{2}' + logpath.slice(index));
            for (let i=0; i<items.length; i++) {
                if (!items[i].match(regex)) continue;
                files.push({
                    match: items[i].match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)[0],
                    file: items[i]
                });
            }
            
            var keep = Number(config.keepFiles);
            if (files.length <= keep) return node.send(data);
            files = files.sort( function(a,b) {
                if (Number(a.match.substring(0,4)) > Number(b.match.substring(0,4))) return 1;
                if (Number(a.match.substring(0,4)) < Number(b.match.substring(0,4))) return -1;
                if (Number(a.match.substring(5,7)) > Number(b.match.substring(5,7))) return 1;
                if (Number(a.match.substring(5,7)) < Number(b.match.substring(5,7))) return -1;
                if (Number(a.match.substring(8)) > Number(b.match.substring(8))) return 1;
                if (Number(a.match.substring(8)) < Number(b.match.substring(8))) return -1;
                return 0;
            })

            files = files.slice(0, keep+1);
            for (let f of files) {
                console.log("[Log lines] Deleted file " + f.file)
                fs.unlinkSync(path.join(folder, f.file));    
            }
            return node.send(data);
        });
    }

    else return node.send(data);
}