exports = module.exports = function(port,key,num,fun){
    var cluster = require('./cluster');
    var express = require('express');

    var app = express();

    app.loader = function(Method,Route,Path,chkTrust){
        app[Method](Route,function(req,res,next){
            if( chkTrust && !isTrust(req,res) ){
                return res.status(404).end('not trust ip');
            }
            var file =  Path + req.params[0];
            var fun = req.params[1];
            var mod = require(file);
            if(typeof mod[fun] !='function'){
                return res.callback('error','method['+fun+'] not exist in '+file)
            }
            mod[fun](req,res);
        });
    }

    app.static = function(Path){
        app.use(express.static(Path));
    }

    cluster.fork( key|| 'http', num || require('os').cpus().length, function(){
        app.use(error);
        app.listen(port||80);
        if(typeof fun == 'function'){
            fun();
        }
    });


    var error = function (err, req, res, next) {
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

    var isTrust = function(req,res){
        var trust_ip = app.get('trust ip');
        if(!trust_ip){
            return true;
        }
        var user_ip = req.ip;
        var max = trust_ip.length;
        for (var i = 0; i < max; i++) {
            var str = trust_ip[i];
            var len = str.length;
            var sub = user_ip.substr(0, len);
            if (sub == str) {
                return true;
            }
        }
        return false;
    }
    return app;
}