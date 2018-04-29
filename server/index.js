"use strict";
const server = require('./server');

exports.http = function http(opts){
    var app = server();
    if(opts['shell']){
        shell.apply(app,arguments);
    }
    var port = opts['port'] || 80;
    app.listen(port);
}

exports.https = function https(opts){
    var app = server();
    if(opts['shell']){
        shell.apply(app,arguments);
    }
    var fs = require('fs');
    var https = require('https');
    var key  = fs.readFileSync(opts['key'], 'utf8');
    var cert = fs.readFileSync(opts['cert'], 'utf8');
    var credentials = {"key": key, "cert": cert};
    var httpsServer = https.createServer(credentials, app);
    var port = opts['port'] || 443;
    httpsServer.listen(port);
}

function shell(opts){
    var method = null;
    var handle = opts['shell'];
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
