'use strict'

var format = require('util').format
var assert = require('assert')
var _ = require('lodash')
var async = require('async')
var fs = require('fs-extra')
var path = require('path')
var crypto = require('crypto')

var messageToPath = require('../..').warez.messageToPath

describe('messageToPath', function() {

    it('should render template args to path', function(done) {

        var config = {
            template: 'uploads/billing-run/{{billingDate}}/invoices.csv'
        }

        var message = {
            qsftp: {
                templateVars: {
                    billingDate: '2015/04/15'
                }
            }
        }

        messageToPath(config, {}, function(err, middleware) {
            assert.ifError(err)
            middleware(message, 'content', function(err) {
                assert.ifError(err)
                assert.equal(message.qsftp.path, 'uploads/billing-run/2015/04/15/invoices.csv')
                done()
            })
        })
    })

})