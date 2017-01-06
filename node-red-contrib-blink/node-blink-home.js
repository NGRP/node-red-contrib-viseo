const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("blink-home", register, {});
}


const input = (node, data, config) => {
    let token = data.blink.token;
    if (!token) return node.error('Missing Blink Authentication token');

    let URI = data.blink.uri 
    
    request({
        url: URI + '/homescreen',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'TOKEN_AUTH': token
        }
    },
    function (err, response, body) { 
        if (err) return node.error(err);

        let json = JSON.parse(body);
        if (json.message) return node.error(json.message);

        let devices = json.devices;
        let iterate = (idx) => {
            if (idx >= devices.length) return;
            let d = devices[idx];

            if (d.device_type !== "camera") return iterate(idx+1);

            let thumb = d.thumbnail.substring(d.thumbnail.lastIndexOf('/')+1);

            data.url          = URI + '/' +  d.thumbnail + '.jpg'
            data.headers      = { "TOKEN_AUTH": token }
            data.blink.device = d
            node.send(data);

            setTimeout(function(){ iterate(idx+1) }, 1000);  
        }

        iterate(0)
    })
};