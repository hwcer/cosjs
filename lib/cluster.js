//简介高效的群集模块
var util = require('util');
var cosjs = require('./library');
var cluster = require('cluster');
var workers = {};
//添加子进程
exports.fork = function(key,task,num){
    workers[key] = {"task":task,"num":num ||1 }
}
//启动所有进程,调用start之后不要再执行任何代码
exports.start = function () {
    if (cluster.isMaster) {
        for(var k in workers){
            master(k,workers[k]['num']);
        }
    }
    else if (cluster.isWorker) {
        worker();
    }
}

var master = function(key,num){
    if(!key){
        return logs('error:cluster.master args[key] empty');
    }
    var env = {"key":key};
    for(var i=0;i<num;i++){
        var worker = cluster.fork(env);
        worker['cosjs'] = {"key":key, "logs":false, "stop":false };
        worker.on('message', function (msg) {
            var arr = msg.split(' ');
            var cmd = arr.shift();
            if(command[cmd]){
                command[cmd](worker,arr);
            }
        });
    }
}

var worker = function(){
    var id  = cluster.worker['id'];
    var key = process.env["key"] || false;
    if(!key || !workers[key]){
        return false;
    }
    var task = workers[key]['task'];
    if(typeof task == 'function' ){
        task();
    }
}

//////////////////////////以下master中执行/////////////////////////////

cluster.on('exit', function(worker, code, signal) {
    var id = worker['id'];
    var key = worker['cosjs']['key'] || false;
    delete(cluster.workers.id);
    logs(util.format('exit:worker[%d], key:%s, pid:%d, signal:%s', id, key, worker.process.pid, signal||code));
    if(!worker['cosjs']['stop']){
        master(key,1);
    }
});
cluster.on('disconnect', function(worker){
    var id = worker['id'];
    var key = worker['cosjs']['key'] || false;
    logs(util.format('disconnect:worker[%d], key:%s, pid:%d', id, key, worker.process.pid));
});
cluster.on('listening',function(worker,address){
    var id = worker['id'];
    var key = worker['cosjs']['key'] || false;
    logs(util.format('listening:worker[%d], key:%s, pid:%d, port:%d ', id, key, worker.process.pid, address.port));
});


var logs = function(str){
    util.log(str);
    for(var k in cluster.workers){
        var worker = cluster.workers[k];
        if(worker['cosjs']['logs']){
            worker.send(str);
        }
    }
}
//=======================command=========================/

var command = {
    stop : function(worker,args){
        if(!args[0]){
            return false;
        }
        var key = args[0];
        for(var k in cluster.workers){
            var w = cluster.workers[k];
            if(key != w.cosjs.key){
                continue;
            }
            w['cosjs']['stop'] = true;
            w.disconnect();
        }
    },
    start :  function(worker,args){
        if(!args[0]){
            return false;
        }
        var key = args[0];
        if(!workers[key]){
            return false;
        }
        var num = args[1] || workers[key]['num'];
        master(key,num);
    },
    logs :  function(worker){
        worker['cosjs']['logs'] = true;
    }

}