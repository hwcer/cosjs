//http启动脚本
"use strict";
const cosjs = require('cosjs');
const body_parser  = require('body-parser');
const cookie_parser = require('cookie-parser');

cosjs.on('restart',cosjs.restart);

module.exports = function(){
    //设置数据库
    var pool   = cosjs.library('pool');
    var config = require('../config').base;
    var root = config.root;
    pool.redis( 'cache',config.cache);
    pool.mongodb( 'mongodb',config.mongodb);
    var app = this , route = '/api/:m/(*)?' ;
    app.use(route,cookie_parser());
    app.use(route,body_parser.urlencoded({ extended: true,limit:"100kb" }));
    app.session(route,{redis:pool.get('cache'),guid:false,level:2});
    app.server(route,{root:root + '/server',method:'all',output:'jsonp',subpath:4,before:HandleBefore,finish:HandleFinish});
    app.static('/',{root: root+'/wwwroot'});
};




function HandleBefore(callback){
    if(this.path == '/login/'){
        this.session.level = 0;
    };
    callback(null);
};

function HandleFinish(err){
    if(err){
        this.res.status(500);
    }
    if(arguments.length==2){
        var ret = '',callback = arguments[1];
    }
    else {
        var ret = arguments[1],callback = arguments[2];
    }
    var data = {err:err,ret:ret};
    callback(err,data);
};