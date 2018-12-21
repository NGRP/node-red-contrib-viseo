

const helper = require('node-red-viseo-helper');
const path   = require('path');
const fs     = require('fs');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config)
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  })
    }
    RED.nodes.registerType("file-out", register, {})
}

const input = (node, data, config) => {
    let input  = data.payload
    
    let output = helper.resolve(config.path, data, '');
        output = path.normalize(output);

    // Ensure output path
    helper.mkpathsync(path.dirname(output));

    // Write to output
    fs.writeFileSync(output, input, config.content);

    // Set last modified
    if (config.mtimes){
        let mtimes = helper.resolve(config.mtimes, data, '');
        let date = new Date(mtimes);
        fs.utimesSync(output, date, date);
    }

    // override payload with output path
    data.payload = output;
    return node.send(data);
}

    // Function that is syncing up the asynchronous nature of the stream
    // so that the full file can be sent to the API. Copied and edited from speech_to_text.
    var stream_url = function(file, url, cb) {
    var wstream = fs.createWriteStream(file);
    node.status({fill:'blue', shape:'dot',
        text:'downloading file'});

    wstream
        .on('error', function(err) {
        cb(err);
        })
        .on('finish', function () {
        cb();
        });

    request(url).pipe(wstream);
    };