//简介高效的群集模块
var cosjs = require('./cosjs');
var cluster = require('cluster');
var manage = { "char":"[cosjs]# ", "port":null,  "password":null };
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
        if(manage['port']){
            manage['start']();
        }
    }
    else if (cluster.isWorker) {
        worker();
    }
}
//设置远程登录端口和密码,默认关闭
exports.manage = function(port,password){
    manage['port'] = port;
    manage['password'] = password;
}


var master = function(key,num){
    if(!key){
        console.log('cluster.master args[key] empty');
        return false;
    }
    var env = {"key":key};
    for(var i=0;i<num;i++){
        var worker = cluster.fork(env);
        worker['cosjs'] = {"key":key,"stop":false};
    }
}

var worker = function(){
    var id  = cluster.worker['id'];
    var key = process.env["key"] || false;
    console.log('start:worker[%d], Pid:%d, Key:%s', id, cluster.worker.process.pid, key);
    if(!key || !workers[key]){
        return false;
    }
    var task = workers[key]['task'];
    if(typeof task == 'function' ){
        task();
    }
}

//////////////////////////以下master中执行/////////////////////////////
var onExit = function(worker, code, signal) {
    var id = worker['id'];
    var key = worker['cosjs']['key'] || false;
    console.log('exit:worker[%d], Pid:%d, Key:%s, signal:%s', id, worker.process.pid, key, signal||code);
    delete(cluster.workers.id);
    if(!worker['cosjs']['stop']){
        master(key,1);
    }
}

var onFork =function(worker) { }


cluster.on('exit', onExit);
cluster.on('fork', onFork);
cluster.on('disconnect', function(worker){
    var id = worker['id'];
    var key = worker['cosjs']['key'] || false;
    console.log('disconnect:worker[%d], Pid:%d, Key:%s', id, worker.process.pid, key);
});
cluster.on('listening',function(worker,address){
    var id = worker['id'];
    var key = worker['cosjs']['key'] || false;
    console.log('listening:worker[%d], Pid:%d, Key:%s, Address[%s] ', id, worker.process.pid, key,address.address+":"+address.port);
});
//=======================command=========================/
var command = {}
command['exit']= {
    "name": '退出管理',
    "desc": '',
    "handle": function (so) {
        so.end();
    }
}
command['ls']= {
    "name": '列出当前工作进程',
    "desc": '',
    "handle": function (so) {
        var arr = [];
        var msg = function (id, pid, key) {
            arr.push(cosjs.pad(id, 10, ' ') + cosjs.pad(pid, 20, ' ') + key);
        }
        msg('worker', 'pid', 'key');
        for (var k in cluster.workers) {
            var worker = cluster.workers[k];
            msg(k, worker.process.pid, worker.cosjs.key);
        }
        so.send(arr);
    }
}
command['stop']= {
    "name": '停止工作组进程',
    "desc": "stop key",
    "handle": function(so,arg){
        if(!arg[0]){
            return so.send('请输入待停止进程组的标识[key]');
        }
        var key = arg[0];
        for(var k in cluster.workers){
            var worker = cluster.workers[k];
            if(key && key != worker.cosjs.key){
                continue;
            }
            worker['cosjs']['stop'] = true;
            worker.disconnect();
        }
        so.send('进程停止成功');
    }
}
command['start']= {
    "name": '启动工作组进程',
    "desc": "start key [num],默认启动初始时配置的数量",
    "handle": function(so,arg){
        if(!arg[0]){
            return so.send('请输入待启动进程组的标识[key]');
        }
        var key = arg[0];
        if(!workers[key]){
            return so.send('进程组标识不存在');
        }
        var num = arg[1] || workers[key]['num'];
        master(key,num);
        so.send('进程启动成功');
    }
}
command['restart']= {
    "name": '重启工作组进程',
    "desc": 'restart [key],默认重启全部工作组',
    "handle": function(so,arg){
        var key = arg[0]||null;
        for(var k in cluster.workers){
            var worker = cluster.workers[k];
            if(key && key != worker.cosjs.key){
                continue;
            }
            worker.disconnect();
        }
        so.send('进程重启成功');
    }
}
command['help']= {
    "name": '帮助信息',
    "desc": '',
    "handle": function(so) {
        var arr = [];
        var msg = function (cmd, name, desc) {
            arr.push(cosjs.pad(cmd, 10, ' ') + cosjs.pad(name, 20, ' ') + desc );
        }
        for (var k in command) {
            msg(k, command[k]['name'], command[k]['desc']);
        }
        so.send(arr);
    }
}
//=======================manage=========================/
manage.start = function(){
    console.log('cluster manage start');
    var net = require('net');
    var socket = net.createServer();
    //var client  = [];
    socket.on('connection', function(so) {
        //client.push(so);
        so['login'] = false;
        so['send'] = function(msg,input){
            if(typeof msg=='object'){
                msg = manage.char + msg.join("\r\n"+manage.char)
            }
            else{
                msg = manage.char + msg;
            }
            if(!input){
                msg += "\r\n"+manage.char;
            }
            so.write(msg);
        }
        manage.welcome(so);
        so.on('data', function(buffer) {
            var msg = buffer.toString().trim();
            if(!msg){
                return false;
            }
            if(!so['login']){
                return manage.login(so,msg);
            }
            var arr = msg.split(' ');
            var cmd = arr.shift();
            if(command[cmd]){
                command[cmd]['handle'](so,arr);
            }
        });
        so.on('end', function() {
            client.splice(client.indexOf(so), 1);
        })
    });
    socket.listen(manage.port);
}

manage.login = function(so,password){
    if(password == manage['password']){
        so.login = true;
        so.send('Login success,use [help] show command');
    }
    else{
        so.send(["Error, Please try again!","Password:"],true);
    }
}

manage.welcome = function(so){
    so.send(["Welcome cosjs cluster manage!","Please enter password:"],true);
}

exports.command = command;