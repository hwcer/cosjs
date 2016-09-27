
// http://localhost/view/index/
exports = module.exports = function(){
    this.success('ok');
}

// http://localhost/view/index/test
exports.test = function(){
    this.success('ok');
}

// http://localhost/view/index/error
exports.error = function(){
    this.error('error test');
}