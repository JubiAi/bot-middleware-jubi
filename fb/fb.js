"use strict"

// dependencies
const SentenceTokenizer = require("sentence-tokenizer")
const EventEmitter = require("events")
const request = require('request');

class Observer extends EventEmitter { }
class Listener extends EventEmitter { }

var echoObserver = new Observer()
echoObserver.setMaxListeners(Infinity)

// init
var listener = new Listener()
listener.setMaxListeners(Infinity);

var profile = require('./profile.js')
var Tokenizer = new SentenceTokenizer("fbBot")
var delayTime = 5
var bufferTime = 50000

// module.exports.profile = createProfile
module.exports.user = getUserProfile
module.exports.listener = switchOnListeners
module.exports.run = run
module.exports.processAndSend = async (body) => {
    try {
        if(fbListener){
            fbListener.emit("reply|fb", await requestProcessor(body));
        }
    }
    catch (e) {
        console.log(e)
        // fbListener.emit("reply|fb", {
        //     sender: body.sender,
        //     text: "Oops! did not get that",
        //     type: "text"
        // });
    }
}
let fbListener, fbSender


let settings, bot, dbData, url;

function run(fbListener, settingsSent, botSent, dbDataSent, urlSent) {
    settings = settingsSent
    bot = botSent
    dbData = dbDataSent
    url = urlSent
    fbListener.on("request-text|fb", async (req) => {
        try {
            fbListener.emit("reply|fb", await requestProcessor(req));
        }
        catch (e) {
            console.log(e)
            fbListener.emit("reply|fb", {
                sender: req.sender,
                text: "Oops! Something went wrong",
                type: "text"
            });
        }
    })
}

function invalidate(status){
    try{
        if(status&&status.stages&&status.stages.length>1&&status.tracker<status.stages.length-1){
            reply({
                text:"It has been a while. Cancelled the previous conversation.",
                type:"text",
                sender:status.sender
            });
        }
        status.tracker=0;
        status.stages=[{
            text:["Cancelling your current conversation."],
            stage:"selectfallback",
            type:"text"
        }];
        status.stuckCount=0
        status.conversationId=undefined
    }
    catch(e){
        console.log(e);
    }
    return status;
}


function requestProcessor(req) {
    return new Promise(async (resolve, reject) => {
        try {
            let user = await bot.read("user", { senderId: req.sender }, dbData)
            let tags = {}
            if (user && user.tags) {
                tags = user.tags
            }
            let status = await bot.read("status", { senderId: req.sender }, dbData)
            if(status&&(parseInt(status.timestamp)+parseInt(settings.timeoutSeconds||1200)*1000)<new Date().getTime()){
                status=invalidate(status);
            }
            let requestData = {
                domain: settings.root,
                directMultiplier: settings.directMultiplier,
                fallbackMultiplier: settings.fallbackMultiplier,
                projectId: settings.projectId,
                data: {
                    id: req.sender,
                    text: req.data.text || req.data.title, // "|| req.data.title" for carousal added by ravi sharma
                    user: status,
                    tags: tags
                }
            }
            let body = await makeRequest({ url: url, method: "POST", json: requestData })
            if (body) {
                if (body.stage) {
                    resolve(body.stage);
                }
                else {
                    throw "No stage"
                }
                if (body.user) {
                    body.user.timestamp=new Date().getTime();
                    await bot.update("status", body.user, dbData)
                }
                else {
                    throw "No status"
                }
                return
            }
            else {
                throw "No Body";
            }
            return
        }
        catch (e) {
            return reject(e);
        }
    });
}

function makeRequest(data) {
    return new Promise((resolve, reject) => {
        request(data, function (error, response, body) {
            try {
                if (error) {
                    return reject(error);
                }
                return resolve(body)
            }
            catch (e) {
                return reject(e);
            }
        });
    });
}

function switchOnListeners(app, verificationToken, pageAccessToken, path) {
    fbListener = require('./listen.js')(app, verificationToken, path)
    fbSender = require('./send.js')(pageAccessToken)

    fbListener.on("text|fb", sendTextToNextLayer)
    fbListener.on("referral|fb", sendPostBackToNextLayer)
    fbListener.on("attachments|fb", attachmentsWork)
    fbListener.on("postback|fb", sendPostBackToNextLayer)
    fbListener.on("error|fb", (error) => { console.error(error.status) })
    fbListener.on("validated|fb", (response) => { console.log("Validated webhook " + response.status) })
    fbListener.on("incoming|fb", (response) => { console.log("Incoming message") })
    fbListener.on("read|fb", (response) => { console.log("Read") })
    fbListener.on("delivered|fb", (response) => { console.log("Delivered") })
    fbListener.on("echo|fb", (response) => {
        if (response.data) {
            if (response.data.attachments) {
                response.data.attachments.forEach(function (attachment) {
                    // if (response.data.text) {
                    // echoObserver.emit(this.recipient + "-" + response.data.text.trim())
                    echoObserver.emit(response.recipient + "-" + attachment.type.trim())
                    // echoObserver.emit(response.recipient + "-" + response.data.text.trim()) // added by ravi sharma
                    // }
                }.bind({ recipient: response.recipient }))
            } else if (response.data.text) {
                if (response.data.text) {
                    echoObserver.emit(response.recipient + "-" + response.data.text.trim())
                }
            }
        }
    })

    listener.on("reply|fb", reply)

    function sendTextToNextLayer(response) {
        listener.emit("request-text|fb", response, reply)
    }

    // POSTBACK HAPPENS
    function sendPostBackToNextLayer(response) {
        listener.emit("request-text|fb", response, reply)
    }

    // ATTACHMENT
    function attachmentsWork(response) {
        response.data.attachments.forEach((attachment) => { attachmentTask(response, attachment) })
    }

    function attachmentTask(response, attachment) {
        switch (attachment.type) {
            case "location":
                location.reverseGeo(response, locationiqSettings, attachment.payload.coordinates.lat, attachment.payload.coordinates.long, sendTextToNextLayer)
                break
            case "image":
                console.log(JSON.stringify(response) + "::::image")
                response.data.text = "image::" + attachment.payload.url
                sendTextToNextLayer(response)
                break
            case "audio":
                console.log(JSON.stringify(response) + "::::audio")
                response.data.text = "audio::" + attachment.payload.url
                sendTextToNextLayer(response)
                break
            case "file":
                console.log(JSON.stringify(response) + "::::file")
                response.data.text = "file::" + attachment.payload.url
                sendTextToNextLayer(response)
                break
            default:
                break
        }
    }

    function reply(response) {
        switch (response.type) {
            case "button":
            case "quickReply": prepareAndSendTextAndElements(response, sendOption)
                break
            case "generic":
            case "list": prepareAndSendTextAndElements(response, sendCatalogue)
                break
            case "receipt": prepareAndSendTextAndElements(response, sendReceiptView)
                break
            case "typingOn": fbSender.emit("typingOn|fb", response.sender)
                break
            case "typingOff": fbSender.emit("typingOff|fb", response.sender)
                break
            default: prepareAndSendTextAndElements(response)
                break
        }
    }

    function prepareAndSendTextAndElements(response, callback) {
        if (Array.isArray(response.text) && response.text.length == 1) {
            response.text = response.text[0]
        }
        if (response.text.includes("${")) {
            let data = []
            if (response.text.split("${")[0].trim() != "") { data.push(response.text.split("${")[0].trim()) }
            response.text = response.text.replace(data[0], "")
            data.push((response.text.split("}")[0]).trim() + "}")
            if (response.text.split("}")[1].trim() != "") { data.push(response.text.split("}")[1].trim()) }
            response.text = data
        }

        // extract media
        let tempStr = response.text
        let match = findMatch(tempStr)
        let mediaFlag = false
        while (match && typeof response.text == "string") {
            response.text = response.text.replace(match[0], "\\n" + match[0] + "\\n")
            tempStr = tempStr.replace(match[0], "")
            match = findMatch(tempStr)
            mediaFlag = true
        }
        // new line
        if (Array.isArray(response.text)) {
            for (let index in response.text) {
                while (response.text[index].includes("|break|")) {
                    response.text[index] = response.text[index].replace("|break|", "")
                }
            }
        }
        else {
            while (response.text.includes("|break|")) {
                response.text = response.text.replace("|break|", "\\n ")
            }
        }

        if (response.text.includes("\\n")) {
            response.text = response.text.split("\\n")
        } else if (response.text.length > 50 && !mediaFlag) {
            Tokenizer.setEntry(response.text)
            response.text = Tokenizer.getSentences()
        }
        if (response.text instanceof Array && response.text.length === 1) {
            response.text = response.text[0]
        }

        if (typeof response.text === "string") {
            try {
                switch (response.type) {
                    case "generic":
                    case "list":
                    case "receipt":
                        sendMediaOrTextAfterTyping(response.sender, response.text)
                        echoObserver.once(response.sender + "-" + response.text.trim(),
                            sendView.bind({ response: response, callback: callback }))
                        break
                    case "button":
                    case "quickReply":
                        sendOption(response.sender, response.text, response.next.data, (response.type === "button"))
                        break
                    default:
                        sendMediaOrTextAfterTyping(response.sender, response.text)
                        break
                }
            }
            catch (e) {
                console.log(e)
            }

        } else if (response.text instanceof Array) {
            let textArray = response.text
            let started = false
            for (let i = 0; i < textArray.length; i++) {
                if (textArray[i] !== "") {
                    if (!started) {
                        sendMediaOrTextAfterTyping(response.sender, textArray[i])
                        started = true
                    }
                    switch (response.type) {
                        case "quickReply":
                        case "button":
                            if (i < textArray.length - 2) {
                                echoObserver.once(response.sender + "-" + getMediaOrTextListener(textArray[i]).trim(), function () {
                                    sendMediaOrTextAfterTyping(this.sender, this.nextText)
                                }.bind({ nextText: textArray[i + 1], sender: response.sender }))
                            } else if (i < textArray.length - 1) {
                                echoObserver.once(response.sender + "-" + getMediaOrTextListener(textArray[i]).trim(),
                                    sendOptions.bind({ nextText: textArray[i + 1], response: response, callback: callback }))
                            }
                            break
                        default:
                            if (i < textArray.length - 1) {
                                echoObserver.once(response.sender + "-" + getMediaOrTextListener(textArray[i]).trim(), function () {
                                    sendMediaOrTextAfterTyping(this.response.sender, this.nextText)
                                }.bind({ nextText: textArray[i + 1], response: response }))
                            }
                            else {
                                echoObserver.once(response.sender + "-" + getMediaOrTextListener(textArray[i]).trim(),
                                    sendView.bind({ response: response, callback: callback })) //undefined callback
                            }
                            break
                    }
                }
            }
        }
    }

    function replaceTags(text) {
        let match = /\${[a-zA-Z0-9_]*}/g.exec(text)
        return text.replace(match, "")
    }


    function sendMediaOrTextAfterTyping(sender, text) {
        sendTypingForTime(sender, text, sendMediaOrText)
    }

    function sendMediaOrText(sender, text) {
        if (findMatch(text)) {
            let match = text.replace("${", "").replace("}", "").split("::")
            let data = {
                mediaType: match[0],
                url: match[1]
            }
            sendMedia(sender, data)
        } else {
            sendText(sender, replaceTags(text));
        }
    }

    function getMediaOrTextListener(text) {
        if (findMatch(text)) {
            let match = text.replace("${", "").replace("}", "").split("::")
            let data = {
                mediaType: match[0],
                url: text.replace(match[0] + "::", "")
            }
            text = data.mediaType
        }
        return text
    }

    function findMatch(str) {
        let match = /\${(image|file|audio|video)::[^(${|})]+}/g.exec(str)
        if (match && match.length > 0) {
            return match
        } else {
            return undefined
        }
    }

    function sendOptions() {
        if (this.callback) {
            this.callback(this.response.sender, this.nextText, this.response.next.data, (this.response.type === "button"))
        }
    }

    function sendTypingForTime(sender, text, callback) {
        sendTyping(sender, true)

        setTimeout(function () {
            callback(this.sender, this.text)
        }.bind({ sender: sender, text: text }), text.length * delayTime)

        setTimeout(function () {
            sendTyping(this.sender, false)
        }.bind({ sender: sender, text: text }), text.length * delayTime + bufferTime)
    }

    function sendTyping(recepient, switchType) {
        if (switchType) {
            fbSender.emit("typingOn|fb", recepient)
        } else {
            fbSender.emit("typingOff|fb", recepient)
        }
    }

    function sendMedia(recepient, data) {
        fbSender.emit("media|fb", recepient, data.mediaType, data.url)
    }

    function sendText(recepient, text) {
        fbSender.emit("text|fb", recepient, text)

    }

    function sendOption(recepient, text, options, buttonFlag) {
        if (buttonFlag) {
            fbSender.emit("buttonTemplate|fb", recepient, text, options)
        } else {
            fbSender.emit("quickReply|fb", recepient, text, options)
        }
    }

    function sendView() {
        if (this.callback) {
            if (this.response.type === "receipt") {
                this.callback(this.response.sender, this.response.next.data)
            } else {
                this.callback(this.response.sender, this.response.next.data, (this.response.type === "list"))
            }
        }
    }

    function sendCatalogue(recepient, view, isList) {
        if (isList) {
            fbSender.emit("listTemplate|fb", recepient, view.list, view.next, view.size)
        } else {
            fbSender.emit("genericTemplate|fb", recepient, view)
        }
    }

    function sendReceiptView(recepient, view) {
        fbSender.emit("listTemplate|fb", recepient, view.items, view.summary, view.address)
    }

    return listener;
}

function getUserProfile(sender, callback) {
    profile.emit("userProfile|fb", sender, callback)
}