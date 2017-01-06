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
    RED.nodes.registerType("blink-event", register, {});
}


const input = (node, data, config) => {
    let token = data.blink.token;
    if (!token) return node.error('Missing Blink Authentication token');

    let URI = data.blink.uri 
    let network = config.network || Object.keys(data.blink.login.networks)[0];

    request({
        url: URI + '/events/network/'+network,
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

        let events = json.event;
        let iterate = (idx) => {
            if (idx >= events.length) return;
            let evt = events[idx];

            if (evt.type !== "motion") return iterate(idx+1);
            
            let th    = evt.video_url;
            let thumb = th.substring(0, th.length-4);
            
            data.url     = URI + '/' + thumb + config.ext
            data.headers = { "TOKEN_AUTH": token }
            data.blink.event = evt
            node.send(data);

            if (config.last){ return; }
            setTimeout(function(){ iterate(idx+1) }, 1000);  
        }

        iterate(0)
    })
};
