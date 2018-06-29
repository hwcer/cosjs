"use strict";
const server = require('./server');

exports.http = function http(opts){
    let app = server();
    if(opts['shell']){
        shell.apply(app,arguments);
    }
    let port = opts['port'] || 80;
    app.listen(port);
}

exports.https = function https(opts){
    let app = server();
    if(opts['shell']){
        shell.apply(app,arguments);
    }
    let fs = require('fs');
    let https = require('https');
    let key  = fs.readFileSync(opts['key'], 'utf8');
    let cert = fs.readFileSync(opts['cert'], 'utf8');
    let credentials = {"key": key, "cert": cert};
    let httpsServer = https.createServer(credentials, app);
    let port = opts['port'] || 443;
    httpsServer.listen(port);
}

function shell(opts){
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
