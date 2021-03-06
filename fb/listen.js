
"use strict"

const EventEmitter = require("events")

class Listener extends EventEmitter { }
var listener = new Listener()
listener.setMaxListeners(Infinity)


module.exports = function (app, verificationToken, path) {

  app.get(path, (req, res) => {
    if (req.query["hub.mode"] === "subscribe" &&
      req.query["hub.verify_token"] === verificationToken) {
      res.status(200).send(req.query["hub.challenge"])
      listener.emit("validated|fb", { status: "Success" })
    } else {
      res.sendStatus(403)
      listener.emit("error|fb", { status: "Failed validation. Make sure the validation tokens match." })
    }
  })

  app.post(path, (req, res) => {
    processRequests(req, res, listener)
  })

  return listener
}

function processRequests(req, res, listener) {
  var data = req.body
  // Make sure this is a page subscription
  if (data.object === "page") {
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function (entry) {
      // Iterate over each messaging event
      if (entry.messaging && entry.messaging instanceof Array) {
        entry.messaging.forEach(function (event) {
          listener.emit("incoming|fb", event)
          if (event.message) {
            receivedMessage(event, listener)
          } else if (event.postback) {
            listener.emit("postback|fb", { data: event.postback, sender: event.sender.id, recipient: event.recipient.id, time: event.timestamp })
          } else if (event.delivery) {
            listener.emit("delivered|fb", { data: event.delivery, sender: event.sender.id, recipient: event.recipient.id, time: event.timestamp })
          } else if (event.read) {
            listener.emit("read|fb", { data: event.read, sender: event.sender.id, recipient: event.recipient.id, time: event.timestamp })
          } else if (event.optin) {
            listener.emit("optin|fb", { data: event.optin, sender: event.sender.id, recipient: event.recipient.id, time: event.timestamp })
          } else if (event.referral) {
            listener.emit("referral|fb", { data: event.referral, sender: event.sender.id, recipient: event.recipient.id, time: event.timestamp })
          } else if (event.account_linking) {
            listener.emit("accountLinking|fb", { data: event.account_linking, sender: event.sender.id, recipient: event.recipient.id, time: event.timestamp })
          } else {
            listener.emit("error|fb", { status: "Webhook received unknown event" })
          }
        })
      }
    })
    res.sendStatus(200)
  }
}

function receivedMessage(event, listener) {
  let senderID = event.sender.id
  let recipientID = event.recipient.id
  let timeOfMessage = event.timestamp
  let message = event.message
  let messageText = message.text
  let messageEcho = message.is_echo
  let messageAttachments = message.attachments
  if (messageEcho) {
    listener.emit("echo|fb", { data: message, sender: senderID, recipient: recipientID, time: timeOfMessage })
  } else if (messageText) {
    listener.emit("text|fb", { data: message, sender: senderID, recipient: recipientID, time: timeOfMessage })
  } else if (messageAttachments) {
    listener.emit("attachments|fb", { data: message, sender: senderID, recipient: recipientID, time: timeOfMessage })
  } else {
    listener.emit("error|fb", { status: "Unknown message type" })
  }
}