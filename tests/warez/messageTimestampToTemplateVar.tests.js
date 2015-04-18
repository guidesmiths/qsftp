'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')

var messageTimestampToTemplateVar = require('../..').warez.messageTimestampToTemplateVar

describe('messageTimestampToTemplateVar', function() {

    it('should transform message timestamp into template vars', function(done) {

        var config = {
            source: '/properties/headers/timestamp',
            destination: 'date',
            template: 'YYYY/MM/DD'
        }

        var message = {
            properties: {
                headers: {
                    timestamp: 1429387393436
                }
            }
        }

        messageTimestampToTemplateVar(config, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                assert.equal(message.qsftp.templateVars.date, '2015/04/18')
                done()
            })
        })
    })

    it('should tolerate string timestamps', function(done) {

        var config = {
            source: '/properties/headers/timestamp',
            destination: 'date',
            template: 'YYYY/MM/DD'
        }

        var message = {
            properties: {
                headers: {
                    timestamp: '1429387393436'
                }
            }
        }

        messageTimestampToTemplateVar(config, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                assert.equal(message.qsftp.templateVars.date, '2015/04/18')
                done()
            })
        })
    })

    it('should report missing timestamps', function(done) {

        var config = {
            source: '/properties/headers/timestamp',
            destination: 'date',
            template: 'YYYY/MM/DD'
        }


        messageTimestampToTemplateVar(config, {}, function(err, middleware) {
            assert.ifError(err)
            middleware({}, 'content', function(err) {
                assert.ok(err)
                assert.equal(err.message, 'Value for pointer \'headers,timestamp\' not found.')
                done()
            })
        })
    })

    it('should report non numeric timestamps', function(done) {

        var config = {
            source: '/properties/headers/timestamp',
            destination: 'date',
            template: 'YYYY/MM/DD'
        }


        var message = {
            properties: {
                headers: {
                    timestamp: 'a'
                }
            }
        }

        messageTimestampToTemplateVar(config, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err)
                assert.equal(err.message, 'a is not a valid timestamp')
                done()
            })
        })
    })


    it('should report negative numeric timestamps', function(done) {

        var config = {
            source: '/properties/headers/timestamp',
            destination: 'date',
            template: 'YYYY/MM/DD'
        }


        var message = {
            properties: {
                headers: {
                    timestamp: -1
                }
            }
        }

        messageTimestampToTemplateVar(config, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err)
                assert.equal(err.message, '-1 is not a valid timestamp')
                done()
            })
        })
    })
})