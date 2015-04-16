'use strict'

var debug = require('debug')('qsftp:warez:uploadToSftpServer')
var format = require('util').format
var Readable = require('stream').Readable
var path = require('path')
var _ = require('lodash')
var Client = require('ssh2').Client

module.exports = uploadToSftpServer

function uploadToSftpServer(config, next) {

    next(null, function(message, content, cb) {

        var connection = new Client()

        connection.on('ready', function() {

            debug(format('Connected to server %s:%s', config.hostname, config.port))

            var ok = connection.sftp(function(err, sftp) {

                sftp.on('error', function(err) {
                    console.error(err)
                })

                var directory = message.qsftp.directory
                var filepath = path.join(directory, message.qsftp.filename)
                var url = format('%s:%s/%s', config.hostname, config.port, filepath)

                debug(format('Uploading %s', url))

                var writeStream = sftp.createWriteStream(filepath)
                writeStream.on('error', function(err) {
                    debug(format('Error uploading %s. Original error was: %s', url, err.message))
                    sftp.end()
                    connection.end()
                    cb(err)
                })
                writeStream.on('close', function() {
                    debug(format('Streamed %d bytes to server %s', Buffer.byteLength(message.qsftp.content, 'utf8'), url))
                    sftp.end()
                    connection.end()
                    cb()
                })

                var readStream = new Readable()
                readStream.push(message.qsftp.content)
                readStream.push(null)
                readStream.pipe(writeStream)
            })

            if (!ok) {
                connection.end()
                cb(new Error('Flooded'))
            }
        })
        connection.on('error', function(err) {
            debug(format('Received error from connection: %s:%s. Original error was: ', config.hostname, config.port, err.message))
            cb(err)
        })

        connection.on('end', function() {
            debug(format('Connection to %s:%s ended', config.hostname, config.port))
        })

        connection.on('close', function() {
            debug(format('Connection to %s:%s closed', config.hostname, config.port))
        })


        debug(format('Connecting to server %s:%s', config.hostname, config.port))
        connection.connect(config)
    })
}