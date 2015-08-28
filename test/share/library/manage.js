var client = [];

exports.start = function(){
    process.send('logs');
    var net = require('net');
    var socket = net.createServer();
    socket.on('connection', function(so) {
        client.push(so);
        so.on('data', function(buffer) {
            var msg = buffer.toString().trim();
            if(!msg){
                return false;
            }
            var arr = msg.split(' ');
            var cmd = arr.shift();
            if(command[cmd]){
                command[cmd](so,arr);
            }
        });
        so.on('end', function() {
            client.splice(client.indexOf(so), 1);
        })
    });
    socket.listen(8080);
}

process.on('message', function (msg) {
    client.forEach(function(c){
        send(c,msg);
    });
});

var send = function(so,msg){
    if(typeof msg=='object'){
        msg = msg.join("\r\n");
    }
    msg += "\r\n";
    so.write(msg);
}

var command = {
    "stop" : function(so,arg){
            if(!arg[0]){
                return send(so,'key empty');
            }
            arg.unshift('stop');
            process.send(arg.join(' '));
    },
    "start" : function(so,arg){
            if(!arg[0]){
                return send(so,'key empty');
            }
            arg.unshift('start');
            process.send(arg.join(' '));
    }
}


