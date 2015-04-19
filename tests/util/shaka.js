var _ = require('lodash')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')
var async = require('async')
var assert = require('assert')


module.exports = shaka

function shaka(file, text, next) {
    async.parallel({
        file: sha1File(file),
        text: sha1Text(text)
    }, function(err, sha) {
        if (err) return next(err)
        assert.equal(sha.file, sha.text)
        next()
    })
}

var sha1Text = _.curry(function(text, next) {
    var shasum = crypto.createHash('sha1')
    shasum.update(text)
    next(null, shasum.digest('hex'))
})

var sha1File = _.curry(function sha1File(filepath, next) {
    fs.readFile(filepath, { encoding: 'utf-8' }, function(err, text) {
        if (err) return next(err)
        sha1Text(text, next)
    })
})