'use strict'

var debug = require('debug')('httq:index')
var format = require('util').format
var _ = require('lodash')
var async = require('async')
var url = require('url')
var warez = require('./lib/warez')
var configure = require('./lib/config/configure')

module.exports = {
    init: init,
    warez: warez
}

function init(broker, config, ctx, next) {
    if (arguments.length === 3) return init(broker, config, {}, arguments[2])
    ctx.broker = broker,
    ctx.warez = _.defaults(ctx.warez || {}, warez)
    ctx.errorHandler = ctx.errorHandler || function(err, details) {
        consoler.error(format('Middleware: %s encountered and error', details.middleware, err))
    }

    configure(config, function(err, routeConfig) {
        if (err) return next(err)
        async.mapSeries(routeConfig.sequence, function(id, callback) {
            var warezConfig = routeConfig.warez[id]
            ctx.warez[warezConfig.type](warezConfig.options || {}, ctx, callback)
        }, next)
    })
}