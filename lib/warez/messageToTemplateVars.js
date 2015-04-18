'use strict'

var debug = require('debug')('qsftp:warez:messageToTemplateVars')
var format = require('util').format
var _ = require('lodash')

module.exports = messageToTemplateVars

function messageToTemplateVars(config, ctx, next) {

    next(null, function(message, content, cb) {
        message.qsftp = message.qsftp || {}
        message.qsftp.templateVars = message.qsftp.templateVars || {}
        message.qsftp.templateVars.message = _.cloneDeep(message)
        message.qsftp.templateVars.content = _.cloneDeep(content)
        cb()
    })
}