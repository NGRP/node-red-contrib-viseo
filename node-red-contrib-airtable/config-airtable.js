const Airtable = require("airtable");

module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    let credentials = this.credentials;
    if (!credentials || !credentials.app || !credentials.key) return;
    this.app = new Airtable({ apiKey: credentials.key }).base(credentials.app);
  };

  RED.nodes.registerType("node-config-airtable", register, {
    credentials: {
      key: { value: undefined },
      app: { value: undefined }
    }
  });
};
