var domain = require('domain');
exports = module.exports = function(port,key,num,fun){
    var cluster = require('./cluster');
    var express = require('express');
    var app = express();
    app.loader = function(req,res,file,fun){
        try{
            var mod = require(file);
        }
        catch(e){
            return res.status(404).end('module not exist');
        }

        if(typeof mod == 'function'){
            var method = mod;
        }
        else{
            var method = mod[fun] || false;
        }
        if( !method ){
            return res.status(404).end('module function not exist');
        }
        //错误跟踪
        var d = domain.create();
        d.on('error', function (err) {
            onError(req, res, err);
        });
        d.add(req);
        d.add(res);
        d.run(function () {
            method(req,res);
        });
    }

    app.static = function(Path){
        app.use(express.static(Path));
    }

    var onError = function (req, res, err) {
        var msg = err.stack || err;
        console.log(msg);
        res.status(500).end(msg);
        restart();
    }

    var restart = function() {
        try {
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

    //fork http server
    cluster.fork( key|| 'http', num || require('os').cpus().length, function(){
        app.listen(port||80);
        if(typeof fun == 'function'){
            fun();
        }
    });

    return app;
}