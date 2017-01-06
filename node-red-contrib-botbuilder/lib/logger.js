"use strict";

global.info  = console.log;
global.error = console.log;

exports.init = function(RED){
    global.info  = RED.log.info;
    global.error = RED.log.error;
};

// Catch all
process.on('uncaughtException', function (err) {
  error('Caught exception: '+err.stack);
});
