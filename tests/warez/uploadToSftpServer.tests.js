'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')
var shaka = require('../util/shaka')

var uploadToSftpServer = require('../..').warez.uploadToSftpServer

describe('uploadToSftpServer', function() {

    this.slow(undefined)

    var uploads = path.join(process.cwd(), 'tests', 'uploads')
    var message = {
        qsftp: {
            path: 'tests/foo.txt'
        }
    }

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
        }, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Connection error was not reported')
                assert.equal(err.message, 'getaddrinfo ENOTFOUND')
                assert.ok(err.recoverable)
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
        }, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Connection error was not reported')
                assert.equal(err.message, 'All configured authentication methods failed')
                assert.ok(err.recoverable)
                done()
            })
        })
    })

    it('should report failed uploads errors', function(done) {

        var message = {
            qsftp: {
                path: 'doesnotexist/foo.txt'
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password'
        }, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Connection error was not reported')
                assert.equal(err.message, 'No such file')
                assert.ok(err.recoverable)
                done()
            })
        })
    })

    it('should upload a simple message to a remote ftp server', function(done) {

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password',
        }, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'foo', function(err) {
                assert.ifError(err)
                shaka(getUploadPath(message.qsftp.path), 'foo', done)
            })
        })
    })

    it('should upload a simple message to a remote ftp server using the base folder', function(done) {

        var message = {
            qsftp: {
                path: 'foo.txt'
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password',
            folder: 'tests'
        }, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'foo', function(err) {
                assert.ifError(err)
                shaka(getUploadPath(message.qsftp.path), 'foo', done)
            })
        })
    })

    it('should upload a large message to a remote ftp server', function(done) {

        var content = crypto.pseudoRandomBytes(1024 * 1024).toString('hex')

        var message = {
            qsftp: {
                path: 'tests/1mb.txt',
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password',
        }, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, content, function(err) {
                assert.ifError(err)
                shaka(getUploadPath(message.qsftp.path), content, done)
            })
        })
    })

    it('should upload a lots of message to a remote ftp server', function(done) {

        this.timeout(numMessages * 500)
        this.slow(numMessages * 500)

        var numMessages = 1000
        var numErrors = 0

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password'
        }, {}, function(err, middleware) {
            assert.ifError(err)
            var q = async.queue(function(data, next) {
                middleware(data.message, data.content, function(err) {
                    if (!err) return shaka(getUploadPath(data.message.qsftp.path), data.content, next)
                    console.warn(err.message)
                    numErrors++
                    next()
                })
            }, 3)

            _.times(numMessages, function(index) {
                q.push({
                    message: {
                        qsftp: {
                            path: 'tests/' + _.padLeft(index + '.txt', 4, '0'),
                        }
                    },
                    content: crypto.pseudoRandomBytes(20).toString('hex')
                })
            })

            q.drain = function(err) {
                assert.ifError(err)
                fs.readdir(uploads, function(err, files) {
                    assert.ifError(err)
                    assert.equal(files.length, numMessages - numErrors)
                    done()
                })
            }
        })
    })

    function getUploadPath(filepath) {
        return path.join(uploads, path.basename(filepath))
    }
})