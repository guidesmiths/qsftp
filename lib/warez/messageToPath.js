'use strict'

var debug = require('debug')('qsftp:warez:messageToPath')
var format = require('util').format
var _ = require('lodash')
var template = require('../util/template')


module.exports = messageToPath

function messageToPath(config, ctx, next) {

    template.compile(config.template, function(err, render) {
        if (err) return next(err)

        next(null, function(message, content, cb) {
            message.qsftp = message.qsftp || {}

            debug(format('Rendering path with template: %s and variables: %s', config.template, message.qsftp.templateVars))

            render(message.qsftp.templateVars, function(err, path) {
                if (err) return cb(err)
                message.qsftp.path = path
                cb()
            })
        })
    })
}