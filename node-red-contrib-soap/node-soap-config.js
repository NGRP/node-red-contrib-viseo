const soap = require('soap');

module.exports = function(RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.auth = config.auth;
        this.options = config.options;
        this.startClient = startClient;
    }

    RED.nodes.registerType("soap-config", register, {
    	credentials: {
            wsdl: { type:"text" },
            login: { type:"text" },
            password: { type:"text" },
            sslKey: { type:"text" },
            sslCert: { type:"text" },
            bearerToken: { type:"text" }
        }
    });
}

// ------------------------------------------
// ---------------- CLIENT ------------------
// ------------------------------------------

async function startClient(config) {
    
    let options = config.options || {};
    if (typeof options === "string") options = JSON.parse(options);

    let wsdl = config.credentials.wsdl;
    if (wsdl.indexOf("://") > 0 && wsdl.slice(-5) !== '?wsdl') wsdl += '?wsdl';
    
    try {
        let cli = await soap.createClientAsync(wsdl, options);
        let creds = config.credentials;
        switch (config.auth) {
            case 'basic':
                cli.setSecurity(new soap.BasicAuthSecurity(creds.login, creds.password));
                break;
            case 'ssl':
                cli.setSecurity(new soap.ClientSSLSecurity(creds.sslKey, creds.sslCert, {}));
                break;
            case 'ws':
                cli.setSecurity(new soap.WSSecurity(creds.login, creds.password));
                break;
            case 'token':
                cli.setSecurity(new soap.BearerSecurity(creds.bearerToken));
                break;
        }
        return cli;
    }
    catch(err) {
        throw(err);
    }
}
