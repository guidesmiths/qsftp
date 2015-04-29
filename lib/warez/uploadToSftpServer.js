'use strict'

var debug = require('debug')('qsftp:warez:uploadToSftpServer')
var ssh2Debug = require('debug')('qsftp:warez:uploadToSftpServer:ssh2')
var format = require('util').format
var Readable = require('stream').Readable
var path = require('path')
var _ = require('lodash')
var Client = require('ssh2').Client

module.exports = uploadToSftpServer

function uploadToSftpServer(config, ctx, next) {

    next(null, function(flowScope, message, content, cb) {

        debug('Running uploadToSftpServer middleware')

        var done = _.once(cb)
        var connection = new Client()
        var uploadPath = config.folder ? path.join(config.folder, flowScope.qsftp.path) : flowScope.qsftp.path
        var url = format('%s:%s/%s', config.hostname, config.port, uploadPath)

        // See https://github.com/mscdex/ssh2/issues/256
        var wtf = new Error(format('Upload: %s did not complete. ssh2 swallowed the error.', url))

        connection.on('ready', function() {

            debug('Connected to server %s:%s', config.hostname, config.port)

            connection.sftp(function(err, sftp) {

                if (err) {
                    connection.end()
                    return recoverable(err)
                }

                debug('Uploading: %s', url)

                var writeStream = sftp.createWriteStream(uploadPath)
                writeStream.on('error', function(err) {
                    debug('Error uploading %s. Original error was: %s', url, err.message)
                    sftp.end()
                    connection.end()
                    recoverable(err)
                })
                writeStream.on('close', function() {
                    debug('Streamed %d bytes to server %s', Buffer.byteLength(content, 'utf8'), url)
                    sftp.end()
                    connection.end()
                    done()
                })

                var readStream = new Readable()
                readStream.push(content)
                readStream.push(null)
                readStream.pipe(writeStream)
            })
        })

        connection.on('error', function(err) {
            debug('Received error from connection: %s:%s. Original error was: ', config.hostname, config.port, err.message)
            recoverable(err)
        })

        connection.on('end', function() {
            debug('Connection to %s:%s ended', config.hostname, config.port)
        })

        connection.on('close', function() {
            debug('Connection to %s:%s closed', config.hostname, config.port)
            recoverable(wtf)
        })

        debug('Connecting to server %s:%s', config.hostname, config.port)
        connection.connect(_.defaults(config, { debug: ssh2Debug }))

        function recoverable(err) {
            err.recoverable = true
            done(err)
        }
    })
}