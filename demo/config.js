var root = __dirname;
var host = '192.168.2.250';


exports.base = {
    root    : root,
    debug   : 2,
    cache   : host + ':6379',
    mongodb : host +':27017/test',
}

exports.http = {
    'fnum'    : 0,             //fock num,启动进程数量，默认CPU个数
    'port'    : 85,
    'shell'   : root+'/share/http',
};

exports.socket = {
    shell     : root + '/share/socket',
    emitter   : {host:host,port:6379,root:root + '/socket/remote'},          //redis emitter
    gateway   : {host:'127.0.0.1',port:100},
    socket : [
        {host:'127.0.0.1',port:81,maxClient:100,refresh:1000,root:root + '/socket/handle',},
        {host:'127.0.0.1',port:82,maxClient:100,refresh:1000,root:root + '/socket/handle',},
        {host:'127.0.0.1',port:83,maxClient:100,refresh:1000,root:root + '/socket/handle',},
        {host:'127.0.0.1',port:84,maxClient:100,refresh:1000,root:root + '/socket/handle',},
    ],

}