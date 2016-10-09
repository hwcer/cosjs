//http启动脚本
"use strict";
const cosjs = require('cosjs');
const body_parser  = require('body-parser');
const cookie_parser = require('cookie-parser');

cosjs.on('restart',cosjs.restart);

module.exports = function(){
    //设置数据库
    var pool   = cosjs.library('pool');
    var config = require('../config');
    pool.redis( 'cache',config.cache);
    pool.mongodb( 'mongodb',config.mongodb);
    var app = this , route = '/api/:m/(*)?' , login = '/api/login/';
    app.use(route,cookie_parser());
    app.use(route,body_parser.urlencoded({ extended: true,limit:"100kb" }));
    app.session(login,{redis:'cache',guid:false,level:0});
    app.session(route,{redis:'cache',guid:false,level:2});

    app.HandleBefore(route,function(callback){
        //do something before call handle
        callback(null);
    });

    app.HandleFinish(route,function(err){
        if(err){
            this.res.status(500);
        }
        if(arguments.length==2){
            var ret = '',callback = arguments[1];
        }
        else {
            var ret = arguments[1],callback = arguments[2];
        }
        callback({err:err,ret:ret});
    });
};
