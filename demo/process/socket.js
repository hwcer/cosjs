"use strict";

var cosjs  = require('cosjs');
cosjs.on('restart',cosjs.restart);

module.exports = function(opts){
    var config = require('../config');
    var ioRedis = require('socket.io-redis');
    this.adapter(ioRedis(config.cache));
};