'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')

var messageToTemplateVars = require('../..').warez.messageToTemplateVars

describe('messageToTemplateVars', function() {

    it('should copy message and content into template vars', function(done) {

        var message = {
            foo: 1
        }
        var content = {
            bar: 2
        }

        messageToTemplateVars({}, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, content, function(err) {
                assert.ifError(err)
                assert.equal(message.qsftp.templateVars.message.foo, 1)
                assert.equal(message.qsftp.templateVars.content.bar, 2)
                done()
            })
        })
    })


    it('should clone the message and content', function(done) {

        var message = {
            foo: 1
        }
        var content = {
            bar: 2
        }

        messageToTemplateVars({}, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, content, function(err) {
                assert.ifError(err)

                message.foo = 'x'
                content.bar = 'x'

                assert.equal(message.qsftp.templateVars.message.foo, 1)
                assert.equal(message.qsftp.templateVars.content.bar, 2)
                done()
            })
        })
    })
})