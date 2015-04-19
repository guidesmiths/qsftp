# qsftp
An amqp to sftp relay

## Installation
```bash
npm install --save qsftp
```

## Prequisits
1. An sftp server
1. A RabbitMQ broker
1. Familiarity with [Rascal](https://github.com/guidesmiths/rascal)


## Setup
### Step 1. Configure a subscriber using rascal
```json
{
    "rascal": {
        "vhosts": {
            "/": {
                "exchanges": {
                    "e1": {}
                },
                "queues": {
                    "q1": {}
                },
                "bindings": {
                    "b1": {
                        "source": "e1",
                        "destination": "q1"
                    }
                }
            }
        },
        "subscriptions": {
            "s1": {
                "queue": "q1"
            }
        }
    }
}
```
### Step 2. Configure the qsftp middleware
```json
    "qsftp": {
        "routes": {
            "book_loan_v1": {
                "sequence": ["messageToTemplateVars",  "messageToPath", "uploadToSftpServer"],
                "warez": {
                    "messageToPath": {
                        "options": {
                            "template": "examples/{{message.properties.messageId}}.txt"
                        }
                    },
                    "uploadToSftpServer": {
                        "options": {
                            "hostname": "localhost",
                            "port": 10022,
                            "username": "fred",
                            "password": "password"
                        }
                    }
                }
            }
        }
    }
```
### Step 3. Wire up rascal and your middleware
```js
var rascal = require('rascal')
var ware = require('ware');
var qsftp = require('qsftp')
var config = require('./config.json')

rascal.createBroker(rascal.withDefaultConfig(config.rascal), function(err, broker) {
    if (err) return bail(err)

    qsftp.init(config.qsftp.routes.book_loan_v1, {}, function(err, warez) {
        if (err) return bail(err)

        var middleware = ware().use(warez)

        broker.subscribe('s1', function(err, message, content, ackOrNack) {
            if (err) return bail(err)
            middleware.run(message, content, function(err) {
                if (err) return bail(err)
                ackOrNack()
            })
        })
    })
})
```
From this point on, any message sent to the queue will be uploaded to the remote sftp server

## Middleware
qsftp comes with some out of the box middleware but it's easy to substitute or include your own. All you need is a module that exports a single "initialiser" function, responsible for initialising the middleware, e.g.
```js
module.exports = function(config, context, callback) {
    callback(null, function(message, content, next) {
        // Do stuff with the message or content
    })
}
```
The initialiser function should expect three arguments, config, context and a callback. "config" will contain any options specified in the qsftp warez configuration, "context" is in case you need shared state between your middleware and "callback" should provide the middleware function to qsftp

The middleware function should also expect three arguments, message, content and next. "message" is the raw message received from amqp, "content" is the message content (json, text or buffer) and "next" is the callback to continue to the next middleware in the sequence.

You specify your middleware when initialising qsftp
```js
qsftp.init(config, { myCustomMiddleware: myCustomMiddleware }, function(err, warez) {
    // ...
})
```
## Provided Middleware

### messageToTemplateVars
Copies the raw message and content to message.qsftp.templateVars for use in later middleware

### messageTimestampToTemplateVar
Converts a timestamp (milliseconds since 01/01/1970) into a date string and stores it in message.qsftp.templateVars[destintation] for use in later middleware.
```json
{
    "messageTimestampToTemplateVar": {
        "options": {
            "source": "/properties/headers/timestamp",
            "destination": "date",
            "template": "YYYY/MM/DD"
        }
    }
}
```
Source is [json pointers](https://www.npmjs.com/package/json-pointer). Destination is a simple key. The template is a [moment](https://www.npmjs.com/package/moment) date format string.

### messageToPath
Extracts a path (for the sftp upload) by passing the template variables through a [hogan.js](https://www.npmjs.com/package/hogan.js) template. The rendered value is stored in message.qsftp.path
```json
{
    "messageToPath": {
        "options": {
            "template": "examples/{{message.properties.messageId}}.txt"
        }
    }
}
```

### uploadToSftpServer
Uploads the message content to an sftp server using the path specified in message.qsftp.path.
```json
{
    "uploadToSftpServer": {
        "options": {
            "hostname": "localhost",
            "port": 10022,
            "username": "fred",
            "password": "password"
        }
    }
}
```
