const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        /*
        if (this.credentials) {
            console.log(this.credentials);
            this.login = this.credentials.login;
            this.password = this.credentials.password;
        }*/

        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("blink-login", register, {
        credentials: {
            login:     { type:"text"      },
            password:  { type:"password"  }
        }
    });
}

let token = undefined;
const input = (node, data, config) => {

    request({
        url: config.uri+'/login',
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        form: {
            "email" :  node.credentials.login,
            "password": node.credentials.password,
            "client_specifier": "iPhone 9.2 | 2.2 | 222"
        }
    },
    function (err, response, body) { 
        if (err) return node.send({'payload' : err});

        let json = JSON.parse(body);
        if (json.message) return node.error(json.message);

        data.blink = {
            'login' : json,
            'uri'   : config.uri,
            'token' : json.authtoken.authtoken    
        }

        node.send(data);
    });
}







if (this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }