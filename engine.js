const request = require("request");
const dashbot = require("dashbot");

let dashbotId

module.exports.setDashbotId=(id)=>{
    dashbotId=id;
}

module.exports.save = (data, dbData) => {
    // console.log("SAVEEEEEE")
    return new Promise(async function (resolve, reject) {
        try {
            if(data.type=="pre"){
                let savedDataArr = await dbData.engine({dbOpsType:"read",schema:dbData.schemas.user,readLimit:1,offset:0,data:{sender: data.senderId||data.webId}})
                let modelData={
                    sender: data.senderId||data.webId,
                    intent: data.nlu.intents.intent,
                    stageData: data.stage,
                    timestamp: new Date().getTime(),
                    callback: true,
                    channel: data.channel,
                    block:false,
                    tags: {}
                }
                if(data.stage){
                    modelData.stage=data.stage.stage;
                }
                if(savedDataArr.length>0){
                    modelData=savedDataArr[0]    
                }
                modelData=utmExtractor(modelData)
                if(data.prevStage&&data.prevStage.stage&&data.validation.data&&data.prevStage.next&&data.prevStage.next.expectation){
                    modelData.tags[data.prevStage.stage]=data.validation.data
                }
                modelData.tags["userSays"]=data.text;
                modelData.timestamp=new Date().getTime().toString()
                resolve(await dbData.engine({dbOpsType:"createOrUpdate",schema:dbData.schemas.user,query:{sender: data.senderId||data.webId},data:modelData}));
            
            }    
            else if(data.type=="post"){
                let conversationData={
                    sender: data.senderId||data.webId,
                    text: data.text,
                    response: data.stage,
                    timeStamp: new Date().getTime().toString()
                }
                logMessage(data.text,data.stage,data.nlu.intents.intent,data.senderId||data.webId);
                resolve(await dbData.engine({dbOpsType:"create",schema:dbData.schemas.conversation,data:conversationData}))
            }
        }
        catch (e) {
            console.log(e)
            return reject(e);
        }
    })
}

module.exports.readAndUpdateTags = (data, dbData) => {
    return new Promise(async function (resolve, reject) {
        try {
            let savedDataArr = await dbData.engine({ dbOpsType: "read", schema: dbData.schemas.user, readLimit: 1, offset: 0, data: { sender: data.senderId || data.webId } })
            if (savedDataArr.length > 0) {
                let modelData = savedDataArr[0]
                if(data.text){
                    modelData.tags["userSays"] = data.text;
                }
                for (let tagKey in data.tags) {
                    modelData.tags[tagKey] = data.tags[tagKey]
                }
                await dbData.engine({ dbOpsType: "createOrUpdate", schema: dbData.schemas.user, query: { sender: data.senderId || data.webId }, data: modelData });
            }
            resolve();
        }
        catch (e) {
            reject(e);
        }

    });
}

module.exports.readTags = (data, dbData) => {
    return new Promise(async function (resolve, reject) {
        try {
            let savedDataArr = await dbData.engine({ dbOpsType: "read", schema: dbData.schemas.user, readLimit: 1, offset: 0, data: { sender: data.senderId || data.webId } })
            if (savedDataArr.length > 0) {
                return resolve(savedDataArr[0].tags);
            }
            return resolve({});
        }
        catch (e) {
            reject(e);
        }

    });
}

module.exports.decorator = (data, dbData) => {
    return new Promise(async function (resolve, reject) {
        let savedDataArr = await dbData.engine({ dbOpsType: "read", schema: dbData.schemas.user, readLimit: 1, offset: 0, data: { sender: data.senderId || data.webId } })
        let userSays
        if(data.tags){
            userSays=data.tags.userSays
            delete data.tags;
        }
        let modelData = {
            sender: data.senderId || data.webId,
            stage: data.stage,
            stageData: data,
            timestamp: new Date().getTime(),
            callback: true,
            channel: data.channel,
            block: false,
            tags: {}
        }
        if (savedDataArr.length > 0) {
            modelData = savedDataArr[0]
        }
        let tags = modelData.tags;
        tags.userSays=userSays||modelData.tags.userSays;
        const requestDecorator = {
            method: data.next.pre[0].requestType,
            url: data.next.pre[0].url,
            json: {
                data: data,
                reply:data,
                tags: tags,
                sender: data.senderId || data.webId
            }
        }
        request(requestDecorator, async function (err, response, body) {
            if (err) {
                console.log(err)
                return reject(err);
            }
            try {

                if (response.statusCode == data.next.pre[0].respStates["Success"]) {
                    if (typeof body != "object") {
                        body = JSON.parse(body);
                    }
                    modelData.tags = body.tags
                    await dbData.engine({ dbOpsType: "createOrUpdate", schema: dbData.schemas.user, query: { sender: data.senderId || data.webId }, data: modelData })
                    return resolve(body.reply)
                }
                else {
                    console.log("Something went wrong.")
                    return reject("Something went wrong.")
                }

            }
            catch (e) {
                console.log("decorator")
                console.log(e)
                return reject(e)
            }
        })
    })
}

module.exports.validator = (data, dbData) => {
    return new Promise(async function (resolve, reject) {
        let savedDataArr = await dbData.engine({ dbOpsType: "read", schema: dbData.schemas.user, readLimit: 1, offset: 0, data: { sender: data.senderId || data.webId } })
        let modelData = {
            sender: data.senderId || data.webId,
            stage: data.stage.stage,
            stageData: data.stage,
            timestamp: new Date().getTime(),
            callback: true,
            channel: data.channel,
            block: false,
            tags: {}
        }
        if (savedDataArr.length > 0) {
            modelData = savedDataArr[0]
        }
        let tags = modelData.tags;
        const requestValidator = {
            method: data.stage.next.post[0].requestType,
            url: data.stage.next.post[0].url,
            json: {
                data: data.data,
                stage: data.stage.stage,
                tags: tags,
                sender: data.senderId || data.webId
            }
        }
        request(requestValidator, async function (err, response, body) {
            if (err) {
                console.log(err)
                return reject(err);
            }
            try {

                if (response.statusCode == data.stage.next.post[0].respStates["Success"]) {
                    if (typeof body != "object") {
                        body = JSON.parse(body);
                    }
                    data.validated = true
                    // if (body.tags[data.stage.stage]) {
                    //     data.data = body.tags[data.stage.stage]
                    // }
                    if (body.stage) {
                        data.stage = body.stage
                    }
                    modelData.tags = body.tags
                    await dbData.engine({ dbOpsType: "createOrUpdate", schema: dbData.schemas.user, query: { sender: data.senderId || data.webId }, data: modelData })
                    return resolve(data)
                }
                else if (response.statusCode == data.stage.next.post[0].respStates["Failed"]) {
                    data.validated = false
                    delete data.stage
                    return resolve(data)
                }
                else {
                    console.log("Something went wrong.")
                    return reject("Something went wrong.")
                }
            }
            catch (e) {
                console.log("validator")
                console.log(e)
                return reject(e)
            }
        })
    })

}

module.exports.read = (schema, data, dbData) => {
    return new Promise(async function (resolve, reject) {
        try {
            let savedDataArr = await dbData.engine({ dbOpsType: "read", schema: dbData.schemas[schema], readLimit: 1, offset: 0, data: { sender: data.senderId || data.webId || data.sender } })
            if (savedDataArr.length > 0) {
                return resolve(savedDataArr[0])
            }
            return resolve({});
        }
        catch (e) {
            console.log(e)
            return reject(e);
        }
    })
}

module.exports.update = (schema, data, dbData) => {
    return new Promise(async function (resolve, reject) {
        try {
            await dbData.engine({ dbOpsType: "createOrUpdate", schema: dbData.schemas[schema], query: { sender: data.senderId || data.webId || data.sender }, data: data })
            return resolve({ status: "Success" })
        }
        catch (e) {
            console.log(e)
            return reject(e);
        }
    })
}

function logMessage(inMessage,stage,intent,id){
    try{
        // console.log("DASHBOT IO")
        // console.log(dashbotId);
        // console.log(JSON.stringify(stage,null,3))
        // console.log(intent)
        // console.log(id)
        if(dashbotId){
            let dashbotHandler = dashbot(dashbotId).universal;
            dashbotHandler.logIncoming(generateDashboardObject(inMessage,id,intent));
            if(stage){
                let outMessage=""
                if(Array.isArray(stage.text)){
                    for (let text of stage.text){
                        outMessage+=text;
                    }
                }
                else if(typeof stage.text=="string"){
                    outMessage=stage.text
                }
                dashbotHandler.logOutgoing(generateDashboardObject(outMessage,id,intent));
            }
        }
    }
    catch(e){
        console.log(e);
    }
}

function generateDashboardObject(message,id,intent){
    let messageForDashbot = {
       text: message,
       userId: id,
       platformJson: { },

    };
    if(intent){
        messageForDashbot["intent"]={
            name:intent,
            inputs:[]
        }                  
    }
    else{
        messageForDashbot["intent"]={
            name: "NotHandled"
        }
    }
    return messageForDashbot
}

function utmExtractor(data){
    if(data.sender&&data.sender.includes("-")&&!data.tags.utmExtraction){
        let keyValues=data.sender.split("-");
        keyValues
        .map((element)=>{
            if(element&&element.includes(".")&&element.split(".").length==2){
                if(!data.tags[element.split(".")[0]]){
                    data.tags[element.split(".")[0]]=element.split(".")[1]
                }
            }
            return "invalid"
        });
        data.tags.utmExtraction=true;
    }
    return data;
}

