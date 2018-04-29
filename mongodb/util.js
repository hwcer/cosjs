"use strict"
const mongodb = require('mongodb');

function mongodb_util(){}

module.exports = mongodb_util;



mongodb_util.prototype.query = function mongodb_util_query(keys ,fk) {
    let query = {};
    if (!keys) {
        return query;
    }
    fk = fk || '_id';
    if (Array.isArray(keys)) {
        var rk = [];
        keys.forEach((k)=>{
            rk.push(this.ObjectID(k));
        });
        query[fk] = {"$in": rk};
    }
    else {
        query[fk] = this.ObjectID(keys);
    }
    return query;
}

mongodb_util.prototype.fields = function mongodb_util_fields(keys) {
    let fields = {};
    if (!keys) {
        return fields;
    }
    if (Array.isArray(keys)) {
        keys.forEach(function (k) {
            fields[k] = 1;
        });
    }
    else if (typeof keys == 'object') {
        fields = keys;
    }
    else {
        fields[keys] = 1;
    }
    return fields;
}

mongodb_util.prototype.values = function mongodb_util_values(key, val) {
    let value = {};
    if (Array.isArray(key)) {
        key.forEach(function (k) {
            value[k] = val || null;
        });
    }
    else if (typeof key === 'object') {
        value = key;
    }
    else {
        value[key] = val;
    }
    return value;
}

mongodb_util.prototype.isMulti = function mongodb_util_isMulti(id) {
    if (!id || typeof id == 'object') {
        return true;
    }
    else {
        return false;
    }
}

mongodb_util.prototype.ObjectID  = function mongodb_util_ObjectID(id){
    return id ? id : mongodb.ObjectID().toString();
}