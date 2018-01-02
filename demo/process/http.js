//http启动脚本
"use strict";
const cookie = require('cookie-parser')

module.exports = function(opts){
    var app = this;
    var root = opts['root'] + '/handle';
    var route = {route:"*",method:'all',output:'json'}

    console.log(root);
    var server = app.server(root,route,cookie());
    server.on('start',serverHandleStart);
    server.on('finish', serverHandleFinish);
    server.session({redis:"127.0.0.1",guid:false});
};


function serverHandleStart(callback){
    //不需要SESSION验证的接口
    var pubapi = ['/','/login/'];
    if(pubapi.indexOf(this.path) >= 0){
        this.session.level = 0;
    }
    callback();
}


function serverHandleFinish(err,ret,callback){
    return callback({err:err,ret:ret});
}