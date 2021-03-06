
"use strict"

// import dependencies
var request = require("request")

// user-defined dependencies
const EventEmitter = require("events")

// model class
class Sender extends EventEmitter { }
var sender = new Sender()
sender.setMaxListeners(Infinity)
var pageAccessToken



module.exports = function (access_token) {

  // facebook auth
  pageAccessToken = access_token;
  sender.on("text|fb", sendText)
  sender.on("media|fb", sendMedia)
  sender.on("quickReply|fb", sendQuickReply)
  sender.on("buttonTemplate|fb", sendButton)
  sender.on("genericTemplate|fb", sendGeneric)
  sender.on("listTemplate|fb", sendList)
  // sender.on("receiptTemplate|fb", sendReceipt)
  sender.on("typingOn|fb", sendTypingOn)
  sender.on("typingOff|fb", sendTypingOff)
  sender.on("markSeen|fb", sendMarkSeen)
  return sender

}

function sendTypingOn(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  }
  callSendAPI(messageData)
}

function sendTypingOff(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  }
  callSendAPI(messageData)
}

function sendMarkSeen(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  }
  callSendAPI(messageData)
}

// function sendReceipt(recipientId, elements, summary, address) {
//   var messageData = {
//     recipient: {
//       id: recipientId
//     },
//     message: {
//       attachment: {
//         type: "template",
//         payload: {
//           template_type: "receipt",
//           recipient_name: summary.name,
//           order_number: summary.orderNumber,
//           currency: summary.currency,
//           payment_method: summary.paymentMethod,
//           order_url: summary.orderUrl,
//           timestamp: summary.timestamp,
//           merchant_name: summary.vendor,
//           elements: [],
//           summary: {
//             subtotal: summary.subTotal,
//             shipping_cost: summary.convenienceFees,
//             total_tax: summary.tax,
//             total_cost: summary.total
//           },
//           address: address
//         }
//       }
//     }
//   }
//   addElements(elements, messageData.message.attachment.payload.elements)
//   callSendAPI(messageData)
// }

function sendQuickReply(recipientId, messageText, options) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies: []
    }
  }
  addQuickReplies(options, messageData.message.quick_replies)
  callSendAPI(messageData)
}

function sendMedia(recipientId, type, url) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: type,
        payload: {
          url: url
        }
      }
    }
  }
  callSendAPI(messageData)
}

function addQuickReplies(qRepIn, qRepOut) {
  qRepIn.forEach((rep) => { addQuickReply(rep, qRepOut) })
}

function addQuickReply(reply, replies) {
  if (reply) {
    switch (reply.type) {
      case "textWithImage":
        replies.push({
          content_type: "text",
          title: reply.text,
          payload: reply.data,
          image_url: reply.image
        })
        break
      case "location":
        replies.push({
          content_type: reply.type
        })
        break
      default:
        replies.push({
          content_type: "text",
          title: reply.text,
          payload: reply.data
        })
        break
    }
  }
}

function sendText(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  }
  callSendAPI(messageData)
}

function sendGeneric(recipientId, elements) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  }
  addElements(elements, messageData.message.attachment.payload.elements)
  callSendAPI(messageData)
}

function sendList(recipientId, elements, buttons, coverImage) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          elements: [],
          buttons: []
        }
      }
    }
  }
  if (coverImage) {
    messageData.message.attachment.payload.top_element_style = coverImage
  }
  addButtons(buttons, messageData.message.attachment.payload.buttons)
  addElements(elements, messageData.message.attachment.payload.elements)
  callSendAPI(messageData)
}

function addElements(elementsIn, elementsOut) {
  elementsIn.forEach((element) => { addElement(element, elementsOut) })
}

function addElement(element, elements) {
  var elementData = {
    title: element.title,
    image_url: element.image,
    subtitle: element.text
  }
  if (element.priceTag) {
    elementData.quantity = element.quantity
    elementData.price = element.price
    elementData.currency = element.currency
  } else {
    elementData.buttons = []
    addDefaultAction(element.defaultAction, elementData)
    addButtons(element.buttons, elementData.buttons)
  }
  elements.push(elementData)
}

function sendButton(recipientId, messageText, buttons) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: messageText,
          buttons: []
        }
      }
    }
  }
  addButtons(buttons, messageData.message.attachment.payload.buttons)
  callSendAPI(messageData)
}

function addButtons(buttonsIn, buttonsOut) {
  buttonsIn.forEach((button) => {
    addButton(button, buttonsOut)
  })
}

function addButton(button, buttons) {
  if (button) {
    switch (button.type) {
      case "url":
        buttons.push({
          type: "web_url",
          title: button.text,
          url: button.data,
          fallback_url: button.fallback
        })
        break
      case "webView":
        buttons.push({
          type: "web_url",
          title: button.text,
          url: button.data,
          messenger_extensions: true,
          fallback_url: button.fallback,
          webview_height_ratio: button.ratio
        })
        break
      case "phone":
        buttons.push({
          type: "phone_number",
          title: button.text,
          payload: button.data
        })
        break
      case "share":
        buttons.push({
          type: "element_share"
        })
        break
      case "shareWithContents":
        buttons.push({
          type: "element_share",
          share_contents: button.data
        })
        break
      case "logIn":
        buttons.push({
          type: "account_link",
          url: button.data
        })
        break
      case "logOut":
        buttons.push({
          type: "account_unlink"
        })
        break
      default:
        buttons.push({
          type: "postback",
          title: button.text,
          payload: button.data
        })
        break
    }
  }
}

function addDefaultAction(action, element) {
  if (action) {
    if (action.type === "url") {
      element.default_action = {
        type: "web_url",
        url: action.data,
        webview_height_ratio: action.ratio
      }
    } else if (action.type === "webView") {
      element.default_action = {
        type: "web_url",
        url: action.data,
        messenger_extensions: true,
        fallback_url: action.fallback,
        webview_height_ratio: action.ratio
      }
    } else {
      element.default_action = {
        type: "postback",
        payload: action.data
      }
    }
  }
}

function callSendAPI(messageData) {
  if (messageData.recipient && messageData.recipient.id) {
    let reqData = {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: pageAccessToken },
      method: "POST",
      json: messageData
    }

    request(reqData, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(JSON.stringify(messageData) + "sent")
      } else {
        if (messageData.message && messageData.message.attachment && messageData.message.attachment.payload) {
          console.log(JSON.stringify(messageData.message.attachment.payload) + "error")
        }
        console.log(body)
        console.error("Unable to send message.")
        console.error(error);
      }
    })

  }
}

