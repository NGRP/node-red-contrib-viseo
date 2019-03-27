const extend = require('extend');

exports.init = () => {

    global.CONFIG = {};
    if (undefined === process.env.CONFIG_PATH){ return console.log("Missing ENV var CONFIG_PATH"); }
    if (undefined === process.env.NODE_ENV){ return console.log("Missing ENV var NODE_ENV"); }
    if (undefined === process.env.FRAMEWORK_ROOT){ return console.log("Missing ENV var FRAMEWORK_ROOT"); }

    let config = {}

    try {
        config = require(process.env.CONFIG_PATH)[process.env.NODE_ENV] || {};
	    config.server.host = process.env.HOST || config.server.host;
        config.server.verbose = config.server.verbose || true;
	} catch(e) {
    	console.log("no project config file found");
    }
    
    try {
        let frameworkVersion = (require(`${process.env.FRAMEWORK_ROOT}/package.json`) || {}).version;
        config.framework = { 
            version: frameworkVersion || '0.0.0'
        };
    } catch(e) {
    	console.log("no 'package.json' file found for the framework");
    }

    extend(true, CONFIG, config);
};