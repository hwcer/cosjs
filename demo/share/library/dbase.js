
exports.user = function () {
    return this.library.call('mongodb','mongodb','user');
};

exports.daily = function () {
    return this.library.call('mongodb','mongodb','daily');
};