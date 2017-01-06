const path    = require('path');
const fs      = require('fs');
const request = require('request-promise');
const builder = require('botbuilder');
const guid    = require('guid');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
	config.output = ("" == config.output) ? "attachments" : config.output;
	config.path = ("" == config.path) ? process.cwd()+"/files/" : config.path;
        createConfig(config, node);
        this.on('input', (data)  => { input(node, data, config, RED)  });
    }
    RED.nodes.registerType("attachement", register, {});
};

const dispatchOutput = function (atts, node, data) {
	let image = false;
	let audio = false;

        for (let att of atts) {
		if (att.contentType.startsWith('image')) image = true;
		if (att.contentType.startsWith('audio')) audio = true;
	}

	if (image) { node.send([data, null, null, null]); }
	else if (audio) { node.send([null, data, null, null]); }
	else { node.send([null, null, data, null]); }
}

const input = (node, data, config, RED) => {

    var root = data.message;
    if (config.afterPrompt) root = data.prompt;

    if ((root.attachments) && (root.attachments.length > 0)) {

        var i = 0;

        for (let attachment of root.attachments) {

      		// Message with attachment, proceed to download it.
        	// Skype attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
        	var fileDownload = isSkypeMessage(data)
        	    ? requestWithToken(attachment.contentUrl, attachment.contentType, data.bot.settings.storage.accessToken)
        	    : requestSimple(attachment.contentUrl, attachment.contentType);

        	fileDownload.then(
        	    function (response) {
        	        // Store the file
			var fileName = path.normalize(config.path + "/" + guid.create().value);
			storeFile(response, fileName, node, (err) => {
				if (err) {
					throw (err);
				} else {
					let atts;
	                        	if (i==0) atts = []; 

	                        	var fileDesc = {};
	                        	fileDesc.contentType = attachment.contentType;
					fileDesc.length = response.length;
					fileDesc.file = fileName;

					atts.push(fileDesc);
	                        	i++;
					node.log('added attachment #'+i+': '+JSON.stringify(fileDesc))

					if (i==root.attachments.length) {
						RED.util.setMessageProperty(data,config.output,atts,true);
						dispatchOutput(atts, node, data);
					}
				}
			});

        	    }).catch(function (err) {
			node.error('error downloading attachment: '+err);
		        node.send([null, null, null, data]);
        	    });
        }
    } else {
	    // Forward data
	    node.log('no attachement');
	    node.send([null, null, null, data]);
    }
};

var ensureDirectoryExists = function (path, mask, cb) {
     if (typeof mask == 'function') { // allow the `mask` parameter to be optional
           cb = mask;
           mask = 0777;
      };
      fs.mkdir(path, mask, function(err) {
      if (err) {
          if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exis$
          else cb(err); // something else went wrong
      } else cb(null); // successfully created folder
   });
};

// create the path 
var createConfig = function (config, node) {
	ensureDirectoryExists(config.path, 0744, function(err) {
	    if (err) {
		node.error('cannot create the directory '+config.path+', : '+err);
	    }
	    else {
		node.log('path ['+config.path+'] ok');
	    }
	});
};

var storeFile = function (response, fileName, node, cb) {
	fs.writeFile(fileName, response, 'binary', function(err) {
		cb(err);
	});
};

var isSkypeMessage = function (data) {
    return data.message.source === 'skype';
};


// Request file with Authentication Header (used for Skype)
var requestWithToken = function (url, contentType, token) {
        return request({
            url: url,
	    encoding : null,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': contentType
            }
        });
};

var requestSimple = function (url, contentType) {
        return request({
            url: url,
	    encoding : null,
            headers: {
                'Content-Type': contentType
            }
        });
};
