'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var hash = require('hash_file')
var path = require('path')
var request = require('request')
var uploadToSftpServer = require('../..').warez.uploadToSftpServer

describe('uploadToSftpServer', function() {

    var uploads = path.join(__dirname, '../data/uploads')

    beforeEach(function(done) {
        fs.remove(uploads, function(err) {
            if (err) return done(err)
            fs.mkdirp(uploads, '0777', done)
        })
    })

    after(function(done) {
        fs.remove(uploads, done)
    })

    xit('should report connection errors', function(done) {

        var message = {
            qsftp: {
                content: 'foo'
            }
        }

        uploadToSftpServer({
            hostname: 'this-server-should-not-resolve-12asdf32',
            username: 'fred'
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err)
                assert.equal(err.message, 'getaddrinfo ENOTFOUND')
                done()
            })
        })
    })

    it('should report authentication errors', function(done) {

        var message = {
            qsftp: {
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'unknown'
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err, 'Expected authenication error')
                assert.equal(err.message, 'All configured authentication methods failed')
                done()
            })
        })
    })

    it('should report upload errors', function(done) {

        var message = {
            qsftp: {
                directory: 'bad',
                filename: 'foo.txt',
                content: 'foo'
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
                assert.ok(err)
                assert.equal(err.message, 'No such file')
                done()
            })
        })
    })

    xit('should upload a message to the remote sftp server', function(done) {

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
            password: 'password'
        }, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                hash(path.join(uploads, 'foo.txt'), 'sha1', function(err, sha) {
                    assert.ifError(err)
                    assert.equal(sha, '0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33', 'File contents is incorrect')
                    done()
                })
            })
        })
    })

    xit('should upload a really big message to the remote sftp server', function(done) {

        this.timeout(5000)
        this.slow(4000)

        request('https://androidnetworktester.googlecode.com/files/1mb.txt', function(err, response, body) {
            assert.ifError(err)
            assert.ok(/2.*/.test(response.statusCode), format('Error downloading 1mb.txt: %s', response.statusCode))

            var message = {
                qsftp: {
                    directory: 'uploads',
                    filename: '1mb.txt',
                    content: body
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
                    hash(path.join(uploads, '1mb.txt'), 'sha1', function(err, sha) {
                        assert.ifError(err)
                        assert.equal(sha, '1e225b865db0a51abe8a3313fe4ea7c418e6e45e', 'File contents is incorrect')
                        done()
                    })
                })
            })
        })
    })


    xit('should upload lots of files', function(done) {

        this.timeout(60000)
        this.slow(60000)

        var message = {
            qsftp: {
                directory: 'uploads',
                content: 'foo'
            }
        }

        uploadToSftpServer({
            hostname: 'localhost',
            port: 10022,
            username: 'fred',
            password: 'password'
        }, function(err, middleware) {
            assert.ifError(err)

            var q = async.queue(function (message, cb) {
                middleware(message, 'content', cb)
            }, 10)

            q.pause()

            _.times(100, function(index) {
                message = _.cloneDeep(message)
                message.qsftp.filename = _.padLeft(index, 3, '0') + '.txt'
                q.push(message)
            })

            q.drain = function() {
                fs.readdir(uploads, function(err, files) {
                    assert.ifError(err)
                    assert.equal(files.length, 100)
                    done()
                })
            }

            q.resume()

        })
    })

    it('should upload a message to the specified directory on the remote sftp server')

    it('should report authentication errors')

    it('should create directories when needed')
})