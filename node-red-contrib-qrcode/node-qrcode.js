'use strict';

const jsQr = require('jsqr');
const jimp = require('jimp');
const request = require('request');

const getQrCode = (url) => {
  	return new Promise((resolve, reject) => {
  		let requestSettings = {
        url: url,
        method: 'GET',
        encoding: null //to get a binary buffer
  		};

  		request(requestSettings, (error, response, body) => {
  			if(error){
  				reject(error);
  			}
  			else{
  				resolve(response);
  			}
		});
	});
}

const decodeImageFromBuffer = (msg, buffer, node, RED) => {
  //analyse QrCode
  jimp.read(buffer, (err, image) => {
    if(err){
      return node.error(err);
    }

    //Decode
    let jsonQrData = jsQr.decodeQRFromImage(image.bitmap.data, image.bitmap.width, image.bitmap.height);
    //safe parsing of qrCode message to json object
    try {
      msg[node.output] = JSON.parse(jsonQrData);
    } catch (ex) {
      //if it is an URL
      if(jsonQrData.match(/^http(s)?:\/\//)){
        //Save the full URL
        let urlTab, params, paramsTab, url = jsonQrData;
        msg[node.output] = {};
        msg[node.output].url = url;
        urlTab = url.split('?');
        if(urlTab.length > 1){
          params = urlTab[1];
          msg[node.output].params = {};
          paramsTab = params.split('&');
          //Save every params of the URL in an object
          for(let e of paramsTab){
            let [name,value]=e.split('=');
            msg[node.output].params[name]=value;
          }
        }
      }
      else{
        msg[node.output] = jsonQrData;
      }

    }
    return node.send(msg);

   });
}

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const node_qrDecode = function (config) {
        RED.nodes.createNode(this, config);
        this.path = config.path || "prompt.attachments[0].contentUrl";
        this.output = config.output || "payload";
        this.source = config.source || "URL";

        this.on('input', (msg) => {
          //get data (URL or Buffer)
          let data = RED.util.evaluateNodeProperty(this.path,"msg",this,msg);

          // source is a URL
          if(this.source === "URL"){
            //load image
            getQrCode(data).then((response) => {
              let imgBuffer = response.body;
              decodeImageFromBuffer(msg,imgBuffer,this,RED);

            }).catch((err) => {
              return this.error(err);
            });
          }

          // source is a Buffer
          else if(this.source === "Buffer"){
            decodeImageFromBuffer(msg,data,this,RED);
          }
        });
    }

    RED.nodes.registerType('qrDecode', node_qrDecode);
}
