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
    let pageId = (config.pageIdType === "msg") ? helper.getByString(data, config.pageId) : config.pageId;
    let siteId = (config.siteIdType === "msg") ? helper.getByString(data, config.siteId) : config.siteId;

    let url = 'http://logv2.xiti.com/hit.xiti' + '?s=' + siteId + '&p=' + pageId
            + '&hl='+now.getHours()+'x'+now.getMinutes()+'x'+now.getSeconds();
    
    
    request({ 'url': url },  function (err, response, body) { 
        if (err) node.error(err);
    });

    node.send(data);
}
