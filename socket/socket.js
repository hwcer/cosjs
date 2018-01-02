"use strict";
const agents  = require('./agents');
const loader  = require('../library/loader');

//connector
exports = module.exports = function socket_server(root,opts){
    var app = require('socket.io')(opts.port,opts);
    app.verify = null;         //消息验证器
    app.agents = agents(app);
    app.loader = loader(root);
    app.serveClient(false);
    app.on('connection', function (socket) {
        socket.app = app;
        socket.on('error', function (){});
        socket.on('message', handle_call.bind(socket));
    });
    return app;
};



//handle加载器,/test/ , /test/index
function handle_call(){
    if(!this.app.loader) {
        return ;
    }
    if(typeof this.app.verify === 'function'){
        var args = this.app.verify.apply(this,arguments);
    }
    else {
        var args = arguments;
    }
    if(!args){
        return false;
    }
    var name = args[0];
    if(name.indexOf('/')<0){
        name = ['',name,''].join('/');
    }

    var arr = Array.prototype.slice.call(arguments,1);
    var method = this.app.loader.parse(name);
    if( typeof method != 'function'  ){
        return false;
    }

    method.apply(this, arr);
};