/* jslint node:true */

'use strict';

var MongoClient = require('mongodb').MongoClient,
    config = require('./config.js');

exports = module.exports = {
    init: init,
    exists: exists,
    remove: remove,
    add: add
};

var g_db, g_tokens;

function init(callback) {
    MongoClient.connect(config.databaseUrl, function (error, db) {
        if (error) return callback(error);

        g_db = db;
        g_db.createCollection('tokens');
        g_tokens = db.collection('tokens');

        callback(null);
    });
}

function exists(value, callback) {
    g_tokens.find({ value: value }).toArray(function (error, result) {
        if (error) return callback(error);
        callback(null, result ? !!result.length : false);
    });
}

function remove(value, callback) {
    g_tokens.deleteOne({ value: value }, function (error) {
        if (error) return callback(error);
        callback(null);
    });
}

function add(value, callback) {
    g_tokens.insert({ value: value }, function (error, result) {
        if (error) return callback(error);
        if (!result) return callback(new Error('no result returned'));

        callback(null, result);
    });
}