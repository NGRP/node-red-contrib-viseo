'use strict';
const helper  = require('node-red-viseo-helper');
const jsQr    = require('jsqr');
const jimp    = require('jimp');
const request = require('request');
const queryString = require('query-string');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    
    start(RED, node, config);
    this.on('input', (data)  => { input(node, data, config) });
    this.on('close', (done)  => { stop(done) });
  }
  RED.nodes.registerType("qrDecode", register, {});
}

// Flow Function --------------------------------------

const stop  = (done) => { done(); }
const start = (RED, node, config) => { }
const input = (node, data, config) => {

  let value = helper.getByString(data, config.input || 'prompt.attachments[0].contentUrl');

  // 3. End the node
  let done  = (err, json) => {
    if (err) return node.warn('Decode Error: '+err);
    helper.setByString(data, config.output || 'payload', json);
    node.send(data);
  }

  // 1. Buffer decode it
  if (value instanceof Buffer){
    return decodeBuffer(value, done);
  }

  // 2. URL download Image
  if (typeof value === 'string' && value.indexOf('http') === 0){
    request({ url: value, method: 'GET', encoding : null }, (err, res) => {
        if (err) { return node.warn('HTTP Error: ' + err); }
        decodeBuffer(res.body, done);
    });
  }

}

// Utility Function --------------------------------------

const decodeBuffer = (buffer, callback) => {

  // 1. Decode image
  jimp.read(buffer, (err, image) => {
    if (err){ return callback(err); }
    
    // 2. Decode QRCode
    let data = jsQr.decodeQRFromImage(image.bitmap.data, image.bitmap.width, image.bitmap.height);

    // 3. Check is JSON
    try { 
      let json = JSON.parse(data); 
      return callback(undefined, json);
    } catch (ex) { /* exception */ }

    // 4. Is string
    if (data.indexOf('http') !== 0) {
      return callback(undefined, { 'text' : data });
    }
    
    // 5. Parse URL parameters
    let qs  = data.indexOf('?')
    if (qs  < 0) return callback(undefined, { url : data });

        qs  = queryString.parse(data.substring(qs+1))
    qs.url  = data
    return callback(undefined, qs);
  });
}