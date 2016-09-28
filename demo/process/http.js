﻿//http启动脚本
"use strict";
const body = require('body-parser');
const cosjs = require('cosjs');
const cookie = require('cookie-parser');

cosjs.on('restart',cosjs.restart);

module.exports = function(opts){
    //设置数据库
    var pool   = cosjs.library('pool');
    var config = require('../config');
    pool.redis( 'cache',config.cache);
    pool.redis( 'redis',config.redis);
    pool.mongodb( 'mongodb',config.mongodb);
    var app = this;
    app.set('views',config.http.root + '/views');
    app.set('view engine','ejs');
    if(config.debug){
        app.set('view cache',false);
    }
    app.use('/',cookie());
    app.use('/',body.urlencoded({ extended: true,limit:"100kb" }));
};