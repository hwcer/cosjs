
exports = module.exports = function(callback){
    return callback(null,this.config('test'));
}

//路由: /test/index
exports.index = function(callback){
    return callback(null,this.config('test'));
}


//路由: /test/error
exports.error = function(){
    return this.callback('error', 'test error');
}

exports.restart = function(){
    var cosjs = require('cosjs');
    this.callback(null, 'success');
    cosjs.emitter.emit('exit',1,2,3,4,5);
}