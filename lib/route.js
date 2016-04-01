var domain = require('domain');
//模块加载器
exports.loader = function(socket,root,name){
    if(name.substr(-1,1)=='/'){
        name = name.substr(0,name.length - 1);
    }
    var arr = name.split('/');
    if(arr.length>1){
        var fun = arr.pop();
        var file = [root].concat(arr).join('/');
    }
    else{
        var fun = null;
        var file = [root  , name].join('/');
    }

    try{
        var mod = require(file);
    }
    catch(e){
        return socket.error(404,'module not exist');
    }

    if( !fun ){
        var method = mod;
    }
    else{
        var method = mod[fun] || false;
    }
    if( typeof method != 'function'  ){
        return socket.error(404,'module function not exist');
    }
    var d = domain.create();
    d.on('error', function (err) {
        var msg = err.stack || err;
        console.log(msg);
        socket.error(500,msg);
        cluster.restart();
    });
    var arr = Array.from(arguments).slice(3);
    d.run(function () {
        method.apply(socket,arr);
    });
}

