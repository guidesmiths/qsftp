var rascal = require('rascal')
var format = require('util').format
var async = require('async')
var _ = require('lodash')
var config = require('./config.json')
var ware = require('ware');
var qsftp = require('..')
var fs = require('fs-extra')
var path = require('path')
var chalk = require('chalk')

createUploadFolder(function(err) {
    if (err) return bail(err)

    createBroker(function(err, broker) {
        if (err) return bail(err)

        setInterval(function() {
            broker.publish('p1', format('This message was sent at: %s', new Date().toISOString()))
        }, 1000).unref()


        qsftp.init(config.qsftp.routes.book_loan_v1, {}, function(err, warez) {
            if (err) return bail(err)

            var middleware = ware()

            middleware.use(warez)

            broker.subscribe('s1', function(err, message, content, ackOrNack) {
                if (err) return bail(err)
                console.log(format('Received: %s', content))
                middleware.run(message, content, function(err) {
                    if (err) return bail(err)
                    ackOrNack()
                })
            })
        })
    })
})

function bail(err, message, content) {
    console.error(chalk.red(err.message))
    process.exit(1)
}

function createUploadFolder(next) {
    var uploads = path.join(process.cwd(), 'examples', 'uploads')
    async.series([
        fs.remove.bind(fs, uploads),
        fs.mkdirp.bind(fs, uploads),
        fs.chmod.bind(fs, uploads, '0777')
    ], next)
}

function createBroker(next) {
    rascal.createBroker(rascal.withTestConfig(config.rascal), next)
}