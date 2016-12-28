var root = __dirname;
var host = '127.0.0.1';


exports.base = {
    root    : root,
    debug   : 2,
    cache   : host + ':6379',
    mongodb : host +':27017/test',
}

exports.http = {
    'fnum'    : 0,             //fock num,启动进程数量，默认CPU个数
    'port'    : 99,
    'shell'   : root+'/process/http',
};

exports.socket = {
    root      : root + '/socket/remote',
    shell     : root + '/process/socket',
    emitter   : {host:host,port:6379},          //redis emitter
    gateway   : {host:host,port:100},
    socket : [
        {host:'127.0.0.1',port:81,maxClient:100,refresh:1000,},
        {host:'127.0.0.1',port:82,maxClient:100,refresh:1000,},
        {host:'127.0.0.1',port:83,maxClient:100,refresh:1000,},
        {host:'127.0.0.1',port:84,maxClient:100,refresh:1000,},
        {host:'127.0.0.1',port:85,maxClient:100,refresh:1000,},
    ],

}