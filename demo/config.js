var root = __dirname;

exports = module.exports = {
    debug: 2,
    cache   : '192.168.2.250:6379',
    redis   : '192.168.2.250:6380',
    mongodb : '192.168.2.250:27017/test',
}

exports.http = {
    'port'    : 80,
    'root'    : root + '/http',
    'shell'   : root+'/process',
    'host'    : '127.0.0.1',
    'worker'  : 0,
    'static'  : {route:'/',handle: 'wwwroot'},
    'server'  : [
        {route:'/api/*',name:'http',handle:'handle',method:'all',output:'jsonp',subpath:4}
    ],
    'session'  : [
        {route:'/api/login/',level:0},
        {route:'/api/*',redis:'cache',ObjectID:false,level:2,secret:'109927657'}
    ],
};


exports.socket = {
    root      : root + '/socket',
    shell     : root + '/process',
    manager   : {host:'192.168.2.250',port:6379,name:'manager',emit:'redis'},          //manager emitter opts
    gateway   : {host:'127.0.0.1',port:100,name:'gateway'},
    connector : [
        {host:'127.0.0.1',port:81,name:'socket',maxClient:5000,refresh:1000,},
        {host:'127.0.0.1',port:82,name:'socket',maxClient:5000,refresh:1000,},
        {host:'127.0.0.1',port:83,name:'socket',maxClient:5000,refresh:1000,},
        {host:'127.0.0.1',port:84,name:'socket',maxClient:5000,refresh:1000,},
    ],
    worker : [
        {host:'127.0.0.1',port:90,name:'agent',refresh:1000,},
        {host:'127.0.0.1',port:91,name:'battle',refresh:1000,},
        {host:'127.0.0.1',port:92,name:'battle',refresh:1000,},
    ],

}