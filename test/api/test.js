
exports.login = function (req,res) {
    var sid = req.get('sid','int');
    var data = {"sid":sid,"name":"hwc","test":"abc"};

    res.callback(null,data,111);
}

