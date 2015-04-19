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

    var uploads = path.join(process.cwd(), 'tests', 'data', 'uploads')
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

        broker.publish('p1', content, 'library.v1.book.978-3-16-148410-0.loan.created' , function(err, messageId) {
            assert.ifError(err)

            broker.subscribe('s1', function(err, message, content) {
                middleware.run(message, content, function(err, message, content) {
                    assert.ifError(err)
                })
            })

            qsftp.init(config.qsftp.routes.book_loan_v1, {}, function(err, warez) {
                assert.ifError(err)
                _.each(warez, function(ware) {
                    middleware.use(ware)
                })
            })

            middleware.use(function(message, content) {
                shaka(path.join(uploads, messageId + '.txt'), content, done)
            })

        })
    })

    function getUploadPath(filename) {
        return path.join(process.cwd(), 'tests', 'data', filename)
    }
})