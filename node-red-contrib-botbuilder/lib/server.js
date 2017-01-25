"use strict";

const fs = require('fs');
const restify = require('restify');
const builder = require('botbuilder');

let bot;
const route = (callback, options, server) => {
    let opt = options || {};

    // Add GET path for debugging
    server.get('/api/v1/messages/', (req, res, next) => {
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

    callback(undefined, bot);
};

let server;
const createServer = (callback, options, RED) => {
    let opt = options    || {};
    let srv = opt.server || CONFIG.server;
    if (!srv){
        console.log('Missing server configuration, fallback on Node-RED server')
        return callback(undefined, RED.httpNode); 
    }

    // Configure server with credentials if any
    let cfg = {};
    if (srv.certificate){    
        cfg.certificate = fs.readFileSync(srv.certificate.crt);
        cfg.key         = fs.readFileSync(srv.certificate.key);
    }

    // Create server
    server = restify.createServer(cfg);

    // Trap errors
    server.on('error', function(err){
        error(err.message);
        callback(err);
    });

    // Start listening on port
    server.listen(opt.port || CONFIG.server.port, ()  => {
        info(server.name + ' listening to ' + server.url);

        // Serve static files
        let root = process.cwd() + '/webapp/';
        info("Serve static files on "+ root);
        server.get(/\/static\/?.*/, restify.serveStatic({
            directory: root,
            default: 'index.html',
            charSet: 'utf-8',
        }));

        callback(undefined, server);
    });
}

exports.start = (callback, options, RED) => {
    createServer((err, server)=>{
        if (err) return callback(err);
        route(callback, options, server)
    }, options, RED)
}

exports.stop  = () => {
    if (undefined == server) return;
    info('closing HTTP server');
    server.close();
}