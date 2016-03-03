var cluster = require('./cluster');

exports = module.exports = function(app,root){
    return new route(app,root);
}

var route = function(app,root){
    var useRoute = function(type,key,dir){
        if(typeof dir=='function'){
            return app[type](key ,dir);
        }
        app[type](key +'*',function(req,res,next){
            var name = req.params[0];
            if(name.substr(-1,1)=='/'){
                name = name.substr(0,name.length - 1);
            }
            var arr = name.split('/');
            if(arr.length>1){
                var fun = arr.pop();
                var file = [root , dir].concat(arr).join('/');
            }
            else{
                var fun = null;
                var file = [root , dir , name].join('/');
            }
            loader(req,res,file,fun);
        });
    }
    this.get = function(key,dir){
        useRoute('get',key,dir);
    }
    this.post = function(key,dir){
        useRoute('post',key,dir);
    }
    this.all = function(key,dir){
        useRoute('all',key,dir);
    }
    //加载器
    this.loader = loader;
}

var loader = function(req,res,file,fun){
    try{
        var mod = require(file);
    }
    catch(e){
        return res.status(404).end('module not exist');
    }

    if( !fun ){
        var method = mod;
    }
    else{
        var method = mod[fun] || false;
    }
    if( typeof method != 'function'  ){
        return res.status(404).end('module function not exist');
    }
    //错误跟踪
    var onError = function (err) {
        var msg = err.stack || err;
        console.log(msg);
        res.status(500).end(msg);
        cluster.restart();
    }

    var d = require('domain').create();
    d.on('error', function (err) {
        onError(err);
    });
    d.add(req);
    d.add(res);
    d.run(function () {
        method(req,res);
    });
}


