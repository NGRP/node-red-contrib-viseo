// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("set-credentials", register, {});
}

let CONF = {};
const input = (node, data, config) => {

    var creds = (node.credentials.rules_to) ? JSON.parse(node.credentials.rules_to) : [''];
    var rules = config.rules;

    for (let i=0; i<rules.length; i++) {
        if (!rules[i].p) continue;
        let value = getValue(creds[i], rules[i].tot);

        switch(rules[i].pt) {
            case "flow":
              flowContext.set(rules[i].p, value);
              break;
            case "global":
              globalContext.set(rules[i].p, value);
              break;
            case "msg":
            default:
                RED.util.setMessageProperty(msg, rules[i].p, value);
          }
    }

	return node.send(msg);
}

function getValue(val, typ) {
    switch(typ) {
        case "msg":
            return RED.util.getMessageProperty(msg, val);
        case "flow":
            return flowContext.get(val);
        case "global":
            return globalContext.get(val);
        case "str": 
            if (typeof(val) === "string") return val;
            else if (typeof(val === "object")) return JSON.stringify(val);
            else return String(val);
        case "num": 
            return Number(val);
        case "bool":
            return (val === "true");
        case "json":
            if (typeof(val === "object")) return val;
            else return JSON.stringify(val);
        default :
            return val;
    }
}