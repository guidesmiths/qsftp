var format = require('util').format
var assert = require('assert')
var rascal = require('rascal')
var async = require('async')
var _ = require('lodash')
var path = require('path')
var fs = require('fs-extra')
var config = require('./qsftp.tests.json')
var shaka = require('./util/shaka')
var crypto = require('crypto')
var ware = require('ware');
var qsftp = require('..')

describe('qsftp', function() {

    this.timeout(10000)
    this.slow(5000)

    var uploads = path.join(process.cwd(), 'tests', 'uploads')
    var broker

    beforeEach(function(done) {
        async.series([
            function(cb) {
                rascal.createBroker(rascal.withTestConfig(config.rascal), function(err, _broker) {
                    cb(err, broker = _broker)
                })
            },
            fs.remove.bind(fs, uploads),
            fs.mkdirp.bind(fs, uploads),
            fs.chmod.bind(fs, uploads, '0777')
        ], done)
    })

    afterEach(function(done) {
        broker ? broker.nuke(done) : done()
    })

    after(function(done) {
        fs.remove(uploads, done)
    })

    it('should upload message content to an sftp server', function(done) {

        var middleware = ware()
        var content = crypto.pseudoRandomBytes(1024).toString('hex')

        broker.publish('p1', content, 'library.v1.book.978-3-16-148410-0.loan.created' , assert.ifError)

        broker.subscribe('s1', function(err, subscription) {
            assert.ifError(err)
            subscription.on('message', function(message, content, ackOrNack) {
                middleware.run({}, message, content, function(err) {
                    assert.ifError(err)
                })
            })
        })

        qsftp.init(config.qsftp.routes.book_loan_v1, {}, function(err, warez) {
            assert.ifError(err)
            _.each(warez, function(ware) {
                middleware.use(ware)
            })
        })

        middleware.use(function(flowScope, message, content) {
            shaka(getUploadPath(message.properties.messageId + '.txt'), content, done)
        })
    })

    it('should incorporate timestamps into the uploaded filename', function(done) {

        var middleware = ware()
        var content = crypto.pseudoRandomBytes(1024).toString('hex')

        broker.publish('p1', content, {
            routingKey: 'library.v2.book.978-3-16-148410-0.loan.created',
            options: {
                headers: {
                    timestamp: 1429550153167
                }
            }
        }, assert.ifError)

        qsftp.init(config.qsftp.routes.book_loan_v2, {}, function(err, warez) {
            assert.ifError(err)
            _.each(warez, function(ware) {
                middleware.use(ware)
            })
        })

        middleware.use(function(flowScope, message, content) {
            shaka(getUploadPath('2015-04-20' + '.txt'), content, done)
        })

        broker.subscribe('s2', function(err, subscription) {
            assert.ifError(err)

            subscription.on('message', function(message, content) {
                middleware.run({}, message, content, function(err) {
                    assert.ifError(err)
                })
            })
        })
    })

    it('should incorporate content disposition into the uploaded filename', function(done) {

        var middleware = ware()
        var content = crypto.pseudoRandomBytes(1024).toString('hex')

        broker.publish('p1', content, {
            routingKey: 'library.v3.book.978-3-16-148410-0.loan.created',
            options: {
                headers: {
                    contentDisposition: 'attachment; filename="978-3-16-148410-0.txt"'
                }
            }
        }, assert.ifError)

        broker.subscribe('s3', function(err, subscription) {
            subscription.on('message', function(message, content) {
                middleware.run({}, message, content, function(err) {
                    assert.ifError(err)
                    done()
                })
            })
        })
    })

    function getUploadPath(filename) {
        return path.join(uploads, filename)
    }
})