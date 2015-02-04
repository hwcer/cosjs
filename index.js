require('./lib/global');
var config = require('./config');

exports.http = function () {
    var server  = require('./lib/server').create();

    this.set = function(key,val){
        this.config(key,val);
    }

    this.config = function(key,val){
        if(typeof key =='object'){
            for(var k in key){
                config[k] = key[k];
            }
        }
        else{
            config[key] = val;
        }
    }

    this.router = function(reg,api){
        var router  = require('./lib/router');
        router.set(reg,api);
    }

    this.cookie = function(key,val){
        var cookie = require('./lib/cookie').config;
        if(typeof key =='object'){
            for(var k in key){
                cookie[k] = key[k];
            }
        }
        else{
            cookie[key] = val;
        }
    }

    this.session = function(key,val){
        var session = require('./lib/session').config;
        if(typeof key =='object'){
            for(var k in key){
                session[k] = key[k];
            }
        }
        else{
            session[key] = val;
        }
    }

    this.msgPack = function(fun){
        server.msgPack = fun;
    }
    this.apiPack = function(fun){
        server.apiPack = fun;
    };

    this.start = server.start;

}





