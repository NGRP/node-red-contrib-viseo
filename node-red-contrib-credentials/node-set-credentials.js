// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("set-credentials", register, {
        credentials: { rules_to: {type: "text"}}
    });
}

const input = (RED, node, data, config) => {

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
                RED.util.setMessageProperty(data, rules[i].p, value);
          }
    }

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