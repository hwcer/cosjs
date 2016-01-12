var cluster = require('./lib/cluster');
exports.fork = cluster.fork;
exports.start = cluster.start;

['http','pool','task','dataset','redis','mongodb','session','library'].forEach(function(k){
    exports[k] = require('./lib/'+k);
});

