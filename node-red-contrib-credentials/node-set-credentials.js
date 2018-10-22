// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        config.rules = RED.nodes.getNode(config.rules);
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("set-credentials", register, {});
}

const input = (RED, node, data, config) => {

    var creds = (config.rules.credentials.rules_to) ? JSON.parse(config.rules.credentials.rules_to) : [''];
    var rules = config.rules.rules;
    var obj = {}

    for (let i=0; i<rules.length; i++) {
        if (!rules[i].p) continue;
        obj[rules[i].p] = getValue(creds[i], rules[i].tot);
    }

    if (config.setType === "global") node.context().global.set(config.set, obj);
    else RED.util.setMessageProperty(data, config.set, obj);
      
	return node.send(data);
}

function getValue(val, typ) {
    switch(typ) {
        case "str": 
            if (typeof(val) === "string") return val;
            else if (typeof(val === "object")) return JSON.stringify(val);
            else return String(val);
        case "num": 
            return Number(val);
        case "json":
            if (typeof(val) === "object") return val;
            else if (typeof(val) === "string") return JSON.parse(val);
        default :
            return val;
    }
}