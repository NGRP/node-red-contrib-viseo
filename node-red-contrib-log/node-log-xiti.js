const helper  = require('node-red-viseo-helper');
const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("log-xiti", register, {});
}


const input = (node, data, config) => {
    let now = new Date();
    let url = 'http://logv2.xiti.com/hit.xiti'
            + '?s=' + helper.resolve(config.siteId, data, config.siteId) //581280
            + '&p=' + helper.resolve(config.pageId, data, config.pageId)
            + '&hl='+now.getHours()+'x'+now.getMinutes()+'x'+now.getSeconds();
    
    
    request({ 'url': url },  function (err, response, body) { 
        if (err) node.error(err);
    });

    node.send(data);
}
