"use strict"

// dependencies
const mobileListen = require("./listen.js");
const mobileSend = require("./send.js")
const SentenceTokenizer = require("sentence-tokenizer")
const EventEmitter = require("events")

class Listener extends EventEmitter { }
var mobileListener = new Listener()
mobileListener.setMaxListeners(Infinity)

var tokenizer = new SentenceTokenizer("mobileBot")

module.exports.listener = switchOnListeners
module.exports.run = run
module.exports.processAndSend=async(body)=>{
  try {
      mobileListener.emit("reply|mobile", await requestProcessor(body));
  }
  catch (e) {
      console.log(e)
      mobileListener.emit("reply|mobile", {
          sender: body.sender,
          text: "Oops! Something went wrong",
          type: "text",
          sender:status.sender
      });
  }
}


let listener,sender,settings,bot,dbData,url;


function run(mobileListener, settingsSent, botSent, dbDataSent, urlSent) {
    settings=settingsSent
    bot=botSent
    dbData=dbDataSent
    url=urlSent
    mobileListener.on("request-text|mobile", async (req) => {
        try {
            mobileListener.emit("reply|mobile", await requestProcessor(req));
        }
        catch (e) {
            console.log(e)
            mobileListener.emit("reply|mobile", {
                sender: req.sender,
                text: "Oops! Something went wrong",
                type: "text"
            });
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

function switchOnListeners (app, settings) {
  listener=mobileListen(app,settings)
  sender = mobileSend(settings)
  listener.on("text|mobile", (response)=>{
    mobileListener.emit("request-text|mobile", response, reply)
  })
  listener.on("attachment|mobile", (response)=>{
    response.data.text = "file::" + response.url
    mobileListener.emit("request-attachment|mobile", response, reply)
  })
  listener.on("error|mobile", (error) => { console.error(error.status) })
  listener.on("reply|mobile", reply)
  return mobileListener;
}

function reply (response) {
      let tempStr = response.text
      let match = findMatch(tempStr)

      let mediaFlag = false
      let botMessage = []
      if (typeof response.text === "string") {
        while (match) {
          response.text = response.text.replace(match[0], "\\n" + match[0] + "\\n")
          tempStr = tempStr.replace(match[0], "")
          match = findMatch(tempStr)
          mediaFlag = true
        }
        // new line
        while (response.text.includes("|break|")) {
          response.text = response.text.replace("|break|", "\\n")
        }

        if (response.text.includes("\\n")) {
          response.text = response.text.split("\\n")
        } else if (response.text.length > 50 && !mediaFlag) {
          tokenizer.setEntry(response.text)
          response.text = tokenizer.getSentences()
        }
      }
      if (typeof response.text === "string") {
        botMessage.push(transformMediaOrText(response.text, 0))
      } else if (response.text instanceof Array) {
        let textArray = response.text
        for (let i = 0; i < textArray.length; i++) {
          botMessage.push(transformMediaOrText(textArray[i], i))
        }
      }

      let options = []
      if (response.mobileFromExisting) {
        response.sender = response.mobileFromExisting
      }
      switch (response.type) {
        case "button":for (let i = 0; i < response.next.data.length; i++) {
          options.push({type: response.next.data[i].type, text: response.next.data[i].text, data: response.next.data[i].data})
        }
          sendOption(response.sender, botMessage, response.gender, response.profile, options, false,response.projectId)
          break
        case "quickReply":for (let i = 0; i < response.next.data.length; i++) {
          options.push({type: response.next.data[i].type, text: response.next.data[i].text, data: response.next.data[i].data})
        }
          sendOption(response.sender, botMessage, response.gender, response.profile, options, true,response.projectId)
          break
        case "generic":sendGeneric(response.sender, botMessage, response.gender, response.profile, response.next.data, response.projectId)
          break
        case "list": console.log("Unsupported")
          break
        case "receipt": console.log("Unsupported")
          break
        case "typingOn":  
            break
        case "typingOff": 
            break
        default: sendText(response.sender, botMessage, response.gender, response.profile,response.projectId)
          break
      }
}

function replaceTags (text) {
  let match = /\${[a-zA-Z0-9_]*}/g.exec(text)
  return text.replace(match, "")
}

function transformMediaOrText (text, i) {
  if (findMatch(text)) {
    let match = text.replace("${", "").replace("}", "").split("::")
    return {
      id: i,
      type: match[0],
      value: match[1]
    }
  } else {
    return {
      id: i,
      type: "text",
      value: replaceTags(text)
    }
  }
}
function findMatch (str) {
  let match = /\${(image|file|audio|video)::[^(${|})]+}/g.exec(str)
  if (match && match.length > 0) {
    return match
  } else {
    return undefined
  }
}

function sendGeneric (recepient, botMessage, gender, profile, options,projectId) {
  sender.emit("generic|mobile", recepient, botMessage, gender, profile, options,projectId)
}

function sendOption (recepient, botMessage, gender, profile, options, buttonFlag,projectId) {
  if (buttonFlag) {
    sender.emit("option|mobile", recepient, botMessage, gender, profile, options,projectId)
  } else {
    sender.emit("persist-option|mobile", recepient, botMessage, gender, profile, options,projectId)
  }
}
function sendText (recepient, botMessage, gender, profile,projectId) {
  sender.emit("text|mobile", recepient, botMessage, gender, profile,projectId)
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


function requestProcessor(req){
    return new Promise(async(resolve,reject)=>{
        try{
          if(bot){
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
                  domain:settings.root,
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
            }
            return 
        }
        catch(e){
            return reject(e);
        }
    });
}