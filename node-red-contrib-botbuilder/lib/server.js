"use strict";

const fs = require('fs');
const restify = require('restify');
const builder = require('botbuilder');


// ------------------------------------------
//  START/STOP
// ------------------------------------------

let server;
const start = (callback, options) => {
    let opt = options    || {};
    let srv = opt.server || CONFIG.server;
    let cfg = {};

    if (!srv){ return callback(new Error("Missing server configuration")); }

    // Configure server with credentials if any
    if (srv.certificate){    
        cfg.certificate = fs.readFileSync(srv.certificate.crt);
        cfg.key         = fs.readFileSync(srv.certificate.key);
    }
    server = restify.createServer(cfg);

    // Trap errors
    server.on('error', function(err){
        error(err.message);
        callback(err);
    });

    // Start listening on port
    server.listen(opt.port || CONFIG.server.port, ()  => {
        info(server.name + ' listening to ' + server.url);
        callback(undefined, server);
    });
};

const stop = () => {
    if (undefined == server) return;
    info('closing HTTP server');
    server.close();
}

// ------------------------------------------
//  ROUTE
// ------------------------------------------

let bot;
const route = (callback, options) => {
    let opt = options || {};

    // Serve static files
    let root = process.cwd() + '/webapp/';
    info("Serve static files on "+ root);
    server.get(/\/static\/?.*/, restify.serveStatic({
        directory: root,
        default: 'index.html',
        charSet: 'utf-8',
    }));

    // Add GET path for debugging
    server.get('/', (req, res, next) => {
        res.send("Hello I'm a Bot !");
        return next();
    });

    // Add ChatBot connector
    let connector = new builder.ChatConnector({
        appId: opt.appId || CONFIG.microsoft.bot.appId,
        appPassword: opt.appPassword || CONFIG.microsoft.bot.appPassword
    });

    server.post('/api/v1/messages', connector.listen());

    // Build new bot
    bot = new builder.UniversalBot(connector, {
        localizerSettings: {
            botLocalePath: "./locale",
            defaultLocale: "en"
        }
    });
    
    // Anytime the major version is incremented any existing conversations will be restarted.
    bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

    // Logging Middleware
    bot.on('incoming', (msg) => { info("Message incoming:" + JSON.stringify(msg) ); })
    bot.on('send',     (msg) => { info("Message outgoing:" + JSON.stringify(msg)); })
    bot.on('error',    (err) => { info("Message error:"    + JSON.stringify(err)); }) 
    callback(bot);
};

// ------------------------------------------
//  EXPORTS
// ------------------------------------------

exports.start = (callback, options) => {
    start((err, server) => {
        if (err) return callback(err);
        route((bot) => { callback(err, server, bot); }, options);    
    }, options);
}

exports.stop = stop;
