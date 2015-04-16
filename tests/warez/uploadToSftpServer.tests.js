'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var hash = require('hash_file')
var path = require('path')
var crypto = require('crypto')

var uploadToSftpServer = require('../..').warez.uploadToSftpServer

describe('uploadToSftpServer', function() {

    this.slow(2000)

    var uploads = path.join(__dirname, '../data/uploads')
    var message = {}

    beforeEach(function(done) {
        async.series([
            fs.remove.bind(fs, uploads),
            fs.mkdirp.bind(fs, uploads),
            fs.chmod.bind(fs, uploads, '0777')
        ], done)
    })

    after(function(done) {
        fs.remove(uploads, done)
    })

    it('should report connection errors', function(done) {
        uploadToSftpServer({
            host: 'this-server-should-not-resolve-12asdf32',
            port: 10022,
            username: 'fred',
            password: 'bad'
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Connection error was not reported')
                assert.equal(err.message, 'getaddrinfo ENOTFOUND')
                done()
            })
        })
    })

    it('should report authentication errors', function(done) {
        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'bad'
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Connection error was not reported')
                assert.equal(err.message, 'All configured authentication methods failed')
                done()
            })
        })
    })

    it('should report failed uploads errors', function(done) {

        var message = {
            qsftp: {
                directory: 'doesnotexist',
                filename: 'foo.txt'
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password'
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Connection error was not reported')
                assert.equal(err.message, 'No such file')
                done()
            })
        })
    })

    it('should upload a simple message to a remote ftp server', function(done) {

        var message = {
            qsftp: {
                directory: 'uploads',
                filename: 'foo.txt',
                content: 'foo'
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password',
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                shaka(path.join(uploads, message.qsftp.filename), message.qsftp.content, done)
            })
        })
    })

    it('should upload a large message to a remote ftp server', function(done) {

        var content = crypto.pseudoRandomBytes(1024 * 1024).toString('hex')

        var message = {
            qsftp: {
                directory: 'uploads',
                filename: '1mb.txt',
                content: content
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password',
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                shaka(path.join(uploads, message.qsftp.filename), message.qsftp.content, done)
            })
        })
    })

    it('should upload a lots of message to a remote ftp server', function(done) {

        var numMessages = 1000
        this.timeout(numMessages * 500)
        this.slow(numMessages * 500)

        var debug = require('debug')('qsftp:tests')

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password',
            debug: debug
        }, function(err, middleware) {
            assert.ifError(err)

            var q = async.queue(function(message, next) {
                middleware(message, 'content', function(err) {
                    assert.ifError(err)
                    shaka(path.join(uploads, message.qsftp.filename), message.qsftp.content, next)
                })
            }, 1)

            _.times(numMessages, function(index) {
                q.push({
                    qsftp: {
                        directory: 'uploads',
                        filename: _.padLeft(index + '.txt', 3, '0'),
                        content: crypto.pseudoRandomBytes(10).toString('hex')
                    }
                })
            })

            q.drain = function(err) {
                assert.ifError(err)
                fs.readdir(uploads, function(err, files) {
                    assert.ifError(err)
                    assert.equal(files.length, numMessages)
                    done()
                })
            }
        })
    })


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

    var sha1File = _.curry(function sha1File(filename, next) {
        fs.readFile(filename, { encoding: 'utf-8' }, function(err, text) {
            if (err) return next(err)
            sha1Text(text, next)
        })
    })
})