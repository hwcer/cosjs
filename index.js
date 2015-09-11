var session    = require('./lib/session');

exports = module.exports = function(app){
    return new cosjs(app);
}

//root,port,share,secret
var cosjs = function(app){
    var self = this;
    //群集
    this.cluster = require('./lib/cluster');
    //模块
    this.library = require('./lib/library');

    this.config = function(name, key, dir) {
        var root = app.get('root');
        var share = app.get('share');
        var file = [root,share,dir||'config',name].join('/');
        var data = require(file);
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
        var share = app.get('share');
        var file = [root,dir||share||'',name].join('/');
        return require(file);
    }


    this.handle = function(req,res,path,name,options){
        if(!options){
            options = {};
        }
        onRequest(req,res);
        if(options['session']){
            req['session'] = session(app, req, res);
        }
        var root = app.get('root');
        var file = [root,path].join('/');
        var M = require(file);
        M[name](req,res);
    }

    this.start = function(){
        app.use(onError);
        var port = app.get('port') || 80;
        app.listen(port);
    }

    var onRequest =  function(req,res) {
        req['get'] = function (key, type) {
            var body = req['body'] || {};
            var val = req['params'][key] || req['query'][key] || body[key] || null;
            if (type && val !== null) {
                val = self.library.dataFormat(val, type);
            }
            return val;
        }

        res["binary"] = function (name, data) {
            var arr = name.split('.');
            var ContentType = res.type(name || 'html');
            res.set("Content-Type", ContentType);
            res.set("Content-Length", data.length);
            res.set("Content-Disposition", "attachment; filename=" + name);
            res.send(data);
        }

        res["callback"] = function (code, data, cache) {
            var data = {"code": code, "data": data};
            if (cache) {
                data['cache'] = cache;
            }
            var filter = app.get('filter');
            if (filter) {
                filter(req, res, data);
            }
            if (req['session'] && req['session']['finish']) {
                req['session']['finish']();
            }
            res.jsonp(data);
        }
    }

    var onError = function (err, req, res, next) {
        var msg = err.stack || err;
        console.log(msg);
        res.status(500);
        res.callback ? res.callback('error',req.params) :  res.send(msg);
        restart();
    }
    //重启进程
    var restart = function() {
        try {
            var cluster = require('cluster');
            // make sure we close down within 30 seconds
            var killtimer = setTimeout(function () {
                process.exit(1);
            }, 2000);
            // But don't keep the process open just for that!
            killtimer.unref();
            // stop taking new requests.
            //serv.close();
            // Let the master know we're dead.  This will trigger a
            // 'disconnect' in the cluster master, and then it will fork
            // a new worker.
            cluster.worker.disconnect();
        }
        catch(e){
            console.log('cluster.worker.disconnect false');
        }
    }
}

