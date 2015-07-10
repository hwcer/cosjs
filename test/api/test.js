
exports.test = function() {
    var self = this;

    this.login = function () {
        var uid = '10001';
        var data = {"id":1,"name":"hwc","test":"abc"};
        var cookie = self.cookie();
        cookie.set(uid,data,self.callback);
    };

    this.logout = function () {
        var cookie = self.cookie();
        cookie.del(self.callback);
    };

}