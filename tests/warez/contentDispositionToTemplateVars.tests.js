'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')

var contentDispositionToTemplateVars = require('../..').warez.contentDispositionToTemplateVars

describe('contentDispositionToTemplateVars', function() {

    it('should parse the content disposition header into template vars', function(done) {

        var message = {
            properties: {
                headers: {
                    contentDisposition: 'attachment; filename="foo.txt"'
                }
            }
        }

        contentDispositionToTemplateVars({}, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                assert.equal(message.qsftp.templateVars.contentDisposition.type, 'attachment')
                assert.equal(message.qsftp.templateVars.contentDisposition.filename, 'foo.txt')
                done()
            })
        })
    })

    it('should report missing content dispositions', function(done) {

        var message = {
            properties: {
                headers: {
                }
            }
        }

        contentDispositionToTemplateVars({}, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err)
                assert.equal(err.message, 'Content disposition header is required')
                done()
            })
        })
    })

    it('should report invalid content dispositions', function(done) {

        var message = {
            properties: {
                headers: {
                    contentDisposition: 'attachment; filename="foo.txt";'
                }
            }
        }

        contentDispositionToTemplateVars({}, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ok(err)
                assert.equal(err.message, 'Error parsing content disposition: attachment; filename=\"foo.txt\";. Original error was: invalid parameter format')
                done()
            })
        })
    })
})