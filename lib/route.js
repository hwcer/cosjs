var cluster = require('./cluster');

exports = module.exports = function(app,root){
    return new route(app,root);
}

var route = function(app,root){
    var self = this;
    this.root = root;

    this.get = function(key,dir){
        if(typeof dir=='function'){
            app.get(key ,dir);
        }
        else {
            app.get(key + '*', function (req, res, next) {
                self.handle(req, res, dir);
            });
        }
    }
    this.post = function(key,dir){
        if(typeof dir=='function'){
            app.post(key ,dir);
        }
        else {
            app.post(key + '*', function (req, res, next) {
                self.handle(req, res, dir);
            });
        }
    }
    this.all = function(key,dir){
        if(typeof dir=='function'){
            app.all(key ,dir);
        }
        else {
            app.all(key + '*', function (req, res, next) {
                self.handle(req, res, dir);
            });
        }
    }
}



route.prototype.handle = function(req,res,dir){
    var name = req.params[0];
    if(name.substr(-1,1)=='/'){
        name = name.substr(0,name.length - 1);
    }
    var arr = name.split('/');
    if(arr.length>1){
        var fun = arr.pop();
        var file = [this.root , dir].concat(arr).join('/');
    }
    else{
        var fun = null;
        var file = [this.root , dir , name].join('/');
    }
    this.loader(req,res,file,fun);
}

route.prototype.loader = function(req,res,file,fun){
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


