const io = require('socket.io-client');

exports = module.exports = function socket_spirit(opts,app){
    var url = `ws://${opts.host}:${opts.port}`;
    var socket = io(url);
    socket.app = app;


    return socket;
};




