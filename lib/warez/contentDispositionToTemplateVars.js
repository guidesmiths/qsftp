'use strict'

var debug = require('debug')('qsftp:warez:contentDispositionToTemplateVars')
var format = require('util').format
var contentDisposition = require('content-disposition')
var _ = require('lodash')


module.exports = contentDispositionToTemplateVars

function contentDispositionToTemplateVars(config, ctx, next) {

    next(null, function(flowScope, message, content, cb) {

        debug('Running contentDispositionToTemplateVars middleware')

        flowScope.qsftp = flowScope.qsftp || {}
        flowScope.qsftp.templateVars = flowScope.qsftp.templateVars || {}

        parseContentDisposition(message.properties.headers.contentDisposition, function(err, contentDisposition) {
            if (err) return cb(err)
            debug(format('Setting contentDisposition: %s', JSON.stringify(contentDisposition)))
            flowScope.qsftp.templateVars.contentDisposition = contentDisposition
            cb()
        })
    })
}

function parseContentDisposition(text, next) {
    if (!text) return next(new Error('Content disposition header is required'))

    var result
    try {
        result = contentDisposition.parse(text)
    } catch (err) {
        return next(new Error(format('Error parsing content disposition: %s. Original error was: %s', text, err.message)))
    }
    next(null, _.defaults({ type: result.type }, result.parameters))
}