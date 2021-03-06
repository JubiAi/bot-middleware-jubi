"use strict"

const twilio = require('twilio');
const request = require('request');
let client
let settings, bot, dbData, url, number;

module.exports.processAndSend = async (body) => {
    try {
        await pushStage(number, await requestProcessor(body))
    }
    catch (e) {
        console.log(e)
        await pushStage(number, {
            sender: body.sender,
            text: "Oops! Something went wrong",
            type: "text"
        })
    }
}

module.exports.init = (app, modal, settingsSent, botSent, dbDataSent, urlSent) => {
    settings = settingsSent
    bot = botSent
    dbData = dbDataSent
    url = urlSent
    number = modal.number
    client = new twilio(modal.accountSid, modal.authToken);
    app.post(modal.path, async (req, res) => {
        let body = {
            sender: req.body["From"].replace("whatsapp:+", ""),
            data: {
                text: req.body["Body"]
            }
        }
        try {
            res.send("")

            await pushStage(req.body["To"], await requestProcessor(body))
        }
        catch (e) {
            console.log(e)
            await pushStage(req.body["To"], {
                sender: body.sender,
                text: "Oops! Something went wrong",
                type: "text"
            })
        }
    })
    return (stage) => {
        pushStage(modal.number, stage)
    };
}

function pushStage(from, stage) {
    return new Promise(async (resolve, reject) => {
        try {
            let completeText=""
            let text
            if (Array.isArray(stage.text)) {
                text = stage.text.reduce((final, element) => {
                    return final + element
                })
            } else {
                text = stage.text
            }
            if (text.includes("${")) {
                let data = []
                data.push(text.split("${")[0].trim())
                text = text.replace(data[0], "")
                data.push((text.split("}")[0]).trim() + "}")
                data.push(text.split("}")[1].trim())
                data.forEach(async (element) => {
                    if (element.includes("${")) {
                        element = element.split("::")[1].replace("}", "").trim()
                        await pushMediaMessage("whatsapp:+" + stage.sender, from, element)
                    } else {
                        element = element.replace("|break|", "\n").replace("|br|", "\n")
                        // await pushMessage("whatsapp:+" + stage.sender, from, element)
                        completeText+=element
                    }
                })

            } else {
                text = text.replace("|break|", "\n").replace("|br|", "\n")
                // await pushMessage("whatsapp:+" + stage.sender, from, text)
                completeText+=text
            }

            // setTimeout(async () => {
                switch (stage.type) {
                    case "quickReply":
                        let qrData = ""
                        let i = 0
                        stage.next.data.forEach((element) => {
                            qrData = qrData + "*" + element.text + "*"
                            if (++i != stage.next.data.length) {
                                qrData = qrData + ",\n"
                            }
                        })
                        let qrText = "\n*Please type* \n" + qrData + " \nas options."
                        completeText+=qrText
                        break;
                    case "button":
                        let btnData = ""
                        let j = 0
                        stage.next.data.forEach((element) => {
                            btnData = btnData + "*" + element.data + "* for " + element.text
                            if (++j != stage.next.data.length) {
                                btnData = btnData + ",\n"
                            }
                        })
                        let btnText = "\n*Please type* \n" + btnData + " \nas options."
                        completeText+=btnText
                        break;
                    case "generic":
                        let carousalData = 'We have some options for you \n\n'
                        stage.next.data.forEach((outerElement, index) => {
                            carousalData += "\n\n*" + outerElement.title + "*, " +  "\n"
                            outerElement.buttons.forEach((element) => {
                                let k = 0
                                carousalData = carousalData + "Type *" + element.data + "* to select " + element.text
                                if (++k != outerElement.buttons.length) {
                                    carousalData = carousalData + ",\n"
                                }
                            })
                        })
                        console.log(carousalData)
                        completeText+=carousalData
                        break;
                    default:
                        break;
                }
            // }, 500)
            await pushMessage("whatsapp:+" + stage.sender, from, completeText)
            return resolve({ status: "success" })
        }
        catch (e) {
            return reject(e)
        }
    })
}

function pushMessage(to, from, body) {
    return new Promise(async (resolve, reject) => {
        try {
            if (client) {
                return resolve(await client.messages.create({
                    body: body,
                    to: to,  // Text this number
                    from: from // From a valid Twilio number
                }))
            }
        }
        catch (e) {
            return reject(e)
        }
    })
}

function pushMediaMessage(to, from, mediaUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            return resolve(await client.messages.create({
                body: "",
                to: to,  // Text this number
                from: from, // From a valid Twilio number
                mediaUrl: mediaUrl
            }))
        }
        catch (e) {
            return reject(e)
        }
    })
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

function invalidate(status) {
    try {
        if (status && status.stages && status.stages.length > 1 && status.tracker < status.stages.length - 1) {
            // console.log("INVALIDATE:::::::::::::::::::::::::::::")
            pushStage(number, {
                text: "It has been a while. Cancelled the previous conversation.",
                type: "text",
                sender: status.sender
            })
        }
        status.tracker = 0;
        status.stages = [{
            text: ["Cancelling your current conversation."],
            stage: "selectfallback",
            type: "text"
        }];
        status.stuckCount = 0
        status.conversationId = undefined
    }
    catch (e) {
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
            if (status && (parseInt(status.timestamp) + parseInt(settings.timeoutSeconds || 1200) * 1000) < new Date().getTime()) {
                status = invalidate(status);
            }
            let requestData = {
                domain: settings.root,
                directMultiplier: settings.directMultiplier,
                fallbackMultiplier: settings.fallbackMultiplier,
                projectId: settings.projectId,
                data: {
                    id: req.sender,
                    text: req.data.text,
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
                    body.user.timestamp = new Date().getTime();
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
        }
        catch (e) {
            return reject(e);
        }
    });
}