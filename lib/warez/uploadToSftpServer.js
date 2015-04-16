'use strict'

var debug = require('debug')('qsftp:warez:uploadToSftpServer')
var format = require('util').format
var Readable = require('stream').Readable
var path = require('path')
var _ = require('lodash')
var Client = require('ssh2').Client;

module.exports = uploadToSftpServer

function uploadToSftpServer(config, next) {

    next(null, function(message, content, cb) {

        var directory = message.qsftp.directory || ''

        var connection = new Client()

        debug(format('Connecting to server %s:%s', config.hostname, config.port))


        connection.on('ready', function() {

            debug(format('Connection to server %s:%s ready', config.hostname, config.port))

            connection.sftp(function(err, sftp) {
                if (err) {
                    debug(format('Error uploading %s:%s/%s/%s. Original error was: %s', config.hostname, config.port, directory, message.qsftp.filename, err.message))
                    return cb(err)
                }

                debug(format('Uploading %s:%s/%s/%s', config.hostname, config.port, directory, message.qsftp.filename))

                var writeStream = sftp.createWriteStream(path.join(directory, message.qsftp.filename))
                writeStream.on('close', function() {
                    debug(format('Closing after %d bytes streamed to server %s:%s/%s/%s', Buffer.byteLength(message.qsftp.content, 'utf8'),config.hostname, config.port, directory, message.qsftp.filename))
                    sftp.end()
                    connection.end()
                    cb()
                })
                writeStream.on('error', function(err) {
                    debug(format('Received error from write stream: ', err.message))
                    sftp.end()
                    connection.end()
                    cb(err)
                })

                var readStream = new Readable()
                readStream.push(message.qsftp.content)
                readStream.push(null)
                readStream.pipe(writeStream)
            })
        })

        connection.on('error', function(err) {
            debug(format('Received error from connection: %s:%s. Original error was: ', config.hostname, config.port, err.message))
            cb(err)
        })

        connection.on('end', function() {
            debug(format('Connection to %s:%s ended', config.hostname, config.port))
            cb()
        })

        connection.connect(config)
    })
}