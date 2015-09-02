var express = require('express');
var session = require('./lib/session');

exports = module.exports = function(){
    return new cosjs();
}

exports.task = require('./lib/task');

exports.cluster = require('./lib/cluster');

exports.dataset = require('./lib/dataset');

exports.library = require('./lib/library');

//config,format,callback
exports.redis = function(config, type, callback){
    if(typeof type == 'function'){
        callback = type;
        type = null;
    }
    else if(!callback){
        callback = exports.library.callback;
    }
    var redis = require('./lib/redis');
    if(type){
        if(redis[type]){
            var redis_conn_hash = new redis[type](config);
            return callback(null, redis_conn_hash);
        }
        else{
            throw new Error("exports.redis arguments[1] error");
        }
    }
    else{
        return redis.conn(config,callback);
    }
}

exports.mongo = function(config,dbName,collName,callback){
    if(typeof collName == 'function'){
        callback = collName;
        collName = null;
    }
    else if(!callback){
        callback = exports.library.callback;
    }
    var mongo = require('./lib/mongo');
    var length = arguments.length;
    if(collName){
        return callback(null,new mongo.coll(config,dbName,collName));
    }
    else{
        return mongo.conn(config,dbName,callback );
    }
}

//root,port,share,secret
var cosjs = function(){

    var app = express();

    var router = express.Router();

    app.use(router);

    this.set = function(key,val){
        app.set(key,val);
    }

    this.router = function(method,match,path){
        router[method](match, function(req,res,next){
            response(req,res,next,path);
        });
    }

    //¾²Ì¬·þÎñÆ÷Ä¿Â¼
    this.static = function(path,options){
        app.use(express.static(path,options));
    }

    this.start = function(){
        var port = app.get('port') || 80;
        app.listen(port);
    }

    this.config = function(name, key, dir) {
        var root = app.get('root');
        var share = app.get('share') || '';
        var file = [root,share,dir||'config',name].join('/');
        try{
            var data = require(file);
        }
        catch (e) {
            var data = false;
        }
        if(!data){
            return false;
        }
        if(!key && key != 0){
            return data;
        }
        else{
            return data[key] || null;
        }
    }

    this.loader = function (name,dir){
        var root = app.get('root');
        var share = app.get('share') || '';
        var file = [root,dir||share,name].join('/');
        var model = false;
        try{
            model = require(file);
        }
        catch (e){
            model = false;
        }
        return model;
    }

    var response = function(req,res,next,path){
        req['cosjs'] = {};      
        var getHeader = req['get'];
        req['get'] = function (key, type) {
            var val = req['query'][key] || req['params'][key] || null;
            if (type && val !== null) {
                val = exports.library.dataFormat(val, type);
            }
            return val;
        }

        req['getHeader'] = getHeader;

        req['session'] = function(keys,callback){
            if (!req['cosjs']['session']) {
                req['cosjs']['session'] = session(app, req, res);
            }
            if (arguments.length == 0) {
                return req['cosjs']['session'];
            }
            if (typeof callback != 'function') {
                callback = exports.library.callback;
            }
            return req['cosjs']['session'].get(keys, callback);
        }

        res["callback"] = function(code,data,cache){
            var data = {"code":code,"data":data};
            if(cache){
                data['cache'] = cache;
            }
            var msgPack = app.get('msgPack');
            if(msgPack){
                msgPack(req,res,data);
            }
            if(req['cosjs']['session']){
                req['cosjs']['session']['finish']();
            }
            res.jsonp(data);
        }

		if(typeof path == 'function'){
			return path(req,res,next);
		}else{
			var root = app.get('root');
			var file = [root,path||'',req.params[0]].join('/');
			var name = req.params[1];
			var api = require(file);
			api[name](req,res);
		}
    }
}



