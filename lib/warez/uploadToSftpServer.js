'use strict'

var debug = require('debug')('qsftp:warez:uploadToSftpServer')
var format = require('util').format
var Readable = require('stream').Readable
var path = require('path')
var _ = require('lodash')
var Client = require('ssh2').Client

module.exports = uploadToSftpServer

function uploadToSftpServer(config, ctx, next) {

    next(null, function(message, content, cb) {

        var once = _.once(cb)
        var connection = new Client()
        var directory = path.dirname(message.qsftp.path)
        var filename = path.basename(message.qsftp.path)
        var url = format('%s:%s/%s', config.hostname, config.port, message.qsftp.path)

        // See https://github.com/mscdex/ssh2/issues/256
        var wtf = new Error(format('Upload: %s did not complete. ssh2 swallowed the error.', url))

        connection.on('ready', function() {

            debug(format('Connected to server %s:%s', config.hostname, config.port))

            connection.sftp(function(err, sftp) {

                debug(format('Uploading: %s', url))

                var writeStream = sftp.createWriteStream(message.qsftp.path)
                writeStream.on('error', function(_err) {
                    debug(format('Error uploading %s. Original error was: %s', url, _err.message))
                    wtf = _err
                    sftp.end()
                    connection.end()
                })
                writeStream.on('close', function() {
                    debug(format('Streamed %d bytes to server %s', Buffer.byteLength(message.qsftp.content, 'utf8'), url))
                    sftp.end()
                    connection.end()
                    wtf = null
                })

                var readStream = new Readable()
                readStream.push(message.qsftp.content)
                readStream.push(null)
                readStream.pipe(writeStream)
            })
        })

        connection.on('error', function(err) {
            debug(format('Received error from connection: %s:%s. Original error was: ', config.hostname, config.port, err.message))
            once(err)
        })

        connection.on('end', function() {
            debug(format('Connection to %s:%s ended', config.hostname, config.port))
        })

        connection.on('close', function() {
            debug(format('Connection to %s:%s closed', config.hostname, config.port))
            once(wtf)
        })

        debug(format('Connecting to server %s:%s', config.hostname, config.port))
        connection.connect(config)
    })
}