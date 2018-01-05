"use strict"
const mongodb = require('mongodb');

module.exports = function mongodb_ObjectID(id){
    return id ? id : mongodb.ObjectID().toString();
};
