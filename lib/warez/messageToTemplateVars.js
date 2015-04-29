'use strict'

var debug = require('debug')('qsftp:warez:messageToTemplateVars')
var format = require('util').format
var _ = require('lodash')

module.exports = messageToTemplateVars

function messageToTemplateVars(config, ctx, next) {
    next(null, function(flowScope, message, content, cb) {

        debug('Running messageToTemplateVars middleware')

        flowScope.qsftp = flowScope.qsftp || {}
        flowScope.qsftp.templateVars = flowScope.qsftp.templateVars || {}
        flowScope.qsftp.templateVars.message = _.cloneDeep(message)
        flowScope.qsftp.templateVars.content = _.cloneDeep(content)
        cb()
    })
}