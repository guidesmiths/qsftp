'use strict'

var debug = require('debug')('qsftp:warez:messageToPath')
var format = require('util').format
var _ = require('lodash')
var template = require('../util/template')


module.exports = messageToPath

function messageToPath(config, ctx, next) {

    template.compile(config.template, function(err, render) {

        if (err) return next(err)

        next(null, function(flowScope, message, content, cb) {

            debug('Running messageToPath middleware')

            flowScope.qsftp = flowScope.qsftp || {}

            debug(format('Rendering path with template: %s', config.template))

            render(flowScope.qsftp.templateVars, function(err, path) {
                if (err) return cb(err)

                debug(format('Setting path to: %s', path))
                flowScope.qsftp.path = path
                cb()
            })
        })
    })
}