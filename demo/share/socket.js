"use strict";

var cosjs  = require('cosjs');
cosjs.on('restart',cosjs.restart);

module.exports = function(key,opts){
    var config = require('../config');
    if(key == 'connector') {
        var ioRedis = require('socket.io-redis');
        this.adapter(ioRedis(config.cache));
    }
};