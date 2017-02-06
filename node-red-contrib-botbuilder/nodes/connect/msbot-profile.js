
const path = require('path');
const i18n = require('../../lib/i18n.js');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("profile", register, {});
}

const input = (node, data, config) => {
    if (undefined === data.user) return node.send(data);

    let user  = data.user;
    let inMsg = data.message;

    // need a first save
    if (undefined === user.address 
    ||  undefined === user.profile){
        user.mdate = Date.now();
    }

    user.address = inMsg.address;
    user.profile = user.profile || {};
    user.profile.name = user.profile.name || inMsg.user.name;


    // Resolve locale
    if (!user.profile.locale){
        let locale = i18n.resolve(data);
        user.profile.locale = locale ? locale : config.defaultLocale;
    }

    // geolocation
    if (inMsg.entities){ 
        user.geo = inMsg.entities.geo
        user.mdate = Date.now(); 
    }

    // Forward message
    node.send(data);
}
