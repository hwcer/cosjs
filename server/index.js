"use strict";
const server = require('./server');

exports.http = function http(opts){
    let app = server();
    let httpServer = require('http').Server(app);
    if(opts['shell']){
        Array.prototype.push.call(arguments,httpServer);
        call_apps_shell.apply(app,arguments);
    }
    httpServer.listen(opts['port'] || 80);
}

exports.https = function https(opts){
    let app = server();
    let fs = require('fs');
    let https = require('https');

    let key  = fs.readFileSync(opts['https']['key'], 'utf8');
    let cert = fs.readFileSync(opts['https']['cert'], 'utf8');
    let credentials = {"key": key, "cert": cert};
    let httpsServer = https.createServer(credentials, app);
    if(opts['shell']){
        Array.prototype.push.call(arguments,httpsServer);
        call_apps_shell.apply(app,arguments);
    }
    httpsServer.listen(opts['port'] || 443);
}

function call_apps_shell(opts){
    let method = null;
    let handle = opts['shell'];
    if(typeof handle == 'function' ){
        method = handle;
    }
    else{
        method = require(handle);
    }
    if(typeof method == 'function' ){
        method.apply(this,arguments);
    }
}
