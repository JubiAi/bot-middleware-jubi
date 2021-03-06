'use strict'

//Declarations
const Crypt = require('g-crypt');
const FCM=require("fcm-push");
const express = require('express');
const webpush = require("web-push");
const bodyParser = require('body-parser');
const socketRedis = require('socket.io-redis');
const redis = require('redis');
const mongoose = require('mongoose');
const bot = require('./engine.js');
const generate = require('./generate.js');
const db = require('./db/operator.js');
const bluebird = require('bluebird');
const httpInit = require('http')
const socketio = require('socket.io');
const mkdirp = require('mkdirp');
const EventEmitter = require('events')
const fs = require("fs");
const fb = require('./fb/fb.js')
const mobile = require('./mobile/mobile.js')
const whatsapp = require("./whatsapp/engine.js")
const url = "https://parramato.com/process"
const devUrl="https://parramato.s3.ap-south-1.amazonaws.com"
const integrityPassPhrase="hbu8b23478gbuy2bcfy2cbcihsdcgUGUYUuy2bcfy2cbcihsdcYBEBIW"
const app = express();
const http = httpInit.Server(app);
var cluster = false
var settings
var fcmServerKey
var sub
var pub
var listener
var dbData
var socketObjectMap={};
var socketIdMapForBot={};
var socketIdReverseMapForBot={};
// var webIdToWebPushMapForBot={};
var webIdToFirebasePushMapForBot={};
var mobileListener
var fbListener
var whatsappCallback
let crypter




 
module.exports.getSub = function () { return sub; }

module.exports.sendData = function (data) {
    try {
        if (cluster) {
            pub.publish("default-web-external", JSON.stringify(data));
        }
        else {
            listener.emit("default-web-external", data)
        }
    }
    catch (e) {
        console.log(e)
    }
}


module.exports.createAdapter = function (intentName, modal) {
    (async function () {
        if (await makeDirectory()) {
            createFiles();
        }
    })();

    function makeDirectory() {
        return new Promise((resolve, reject) => {
            mkdirp(modal.adapterDirectory + "/" + intentName, function (err) {
                if (err) {
                    console.log("Could not create folder. Folder might already exists. Please delete it!")
                    console.log(err)
                    return resolve(false);
                }
                return resolve(true);
            });
        })
    }

    function makeFile(type, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(modal.adapterDirectory + "/" + intentName + "/" + type + ".js", data, function (err) {
                if (err) {
                    console.log("Could not create file.")
                    console.log(err);
                    return reject(err);
                }
                console.log(`Adapter File ${modal.adapterDirectory}/${intentName}/${type}.js was created!`);
                return resolve();
            });
        });
    }

    async function createFiles() {
        await makeFile(modal.operationFileNames.validate, `
        //Jubi AI License https://jubi.bit.ai/pwl/31Lgfu8rU8Hsv3qu for documentation
        module.exports={}`);
        await makeFile(modal.operationFileNames.decorate, `
        //Jubi AI License https://jubi.bit.ai/pwl/31Lgfu8rU8Hsv3qu for documentation
        module.exports={}`);
    }
}

module.exports.createFrontend = async function(modal) {
    
    
    let pwa=generate.buildPWAFiles(modal.firebaseWebConfig,modal.root,modal.projectId,modal.iconPath);
    let html=generate.buildHTMLFile(modal.iconPath,modal.headerCode);
    let loader=generate.buildLoaderFile(modal.projectId,modal.socketDomain,modal.socketPath,modal.passphraseMiddleware,devUrl);
    let theme=generate.buildThemeFile();
    await makeDirectory()
    
    await writeToFile("index.html",html);
    await writeToFile("theme.css",theme);
    await writeToFile("loader.js",loader);
    //pwa
    await writeToFile("manifest.json",pwa.manifest);
    await writeToFile("sw.js",pwa.sw);
    await writeToFile("pwa.js",pwa.pwa);
    await writeToFile("firebase-messaging-sw.js",pwa.firebase);
    
    


    function writeToFile(fileName,data) {
        return new Promise((resolve,reject)=>{
            fs.writeFile(`${modal.staticDirectory}/${fileName}`, data, function (err) {
                if (err) {
                    console.log("Could not create file.")
                    console.log(err);
                    return reject(err);
                }
                console.log(`Frontend File ${modal.staticDirectory}/${fileName} was created!`);
                return resolve();
            });
        })
    }
    function makeDirectory() {
        return new Promise((resolve, reject) => {
            mkdirp(modal.staticDirectory, function (err) {
                if (err) {
                    console.log("Could not create folder. Folder might already exists. Please delete it!")
                    console.log(err)
                    return resolve(false);
                }
                return resolve(true);
            });
        })
    }
    
}

module.exports.mobile = function (modal) {
    if (settings && app && dbData) {
        mobileListener = mobile.listener(app, modal)
        mobile.run(mobileListener, settings, bot, dbData, url)
        return true
    }
    return false
}

module.exports.facebook = function (modal) {
    if (settings && app && dbData) {
        fbListener = fb.listener(app, modal.verificationToken, modal.pageAccessToken, modal.path)
        fb.run(fbListener, settings, bot, dbData, url)
        return true
    }
    return false
}

module.exports.whatsapp = function (modal) {
    if (settings && app && dbData) {
        whatsappCallback = whatsapp.init(app, modal, settings, bot, dbData, url)
        return true
    }
    return false
}

module.exports.Server = function (modal, initCallback) {

    //Init Declarations
    crypter=Crypt(modal.passphraseMiddleware+integrityPassPhrase)
    settings = modal
    cluster = modal.cluster
    fcmServerKey=modal.fcmServerKey
    const io = socketio(http, { path: modal.socketLocalPath });
    const dbUrl = modal.dbUri;
    const port = modal.httpPort;
    // const urlencodedParser = bodyParser.urlencoded({ extended:true,limit:1024*1024*100,type:'application/x-www-form-urlencoding' });    
    const jsonParser = bodyParser.json({ limit: 1024 * 1024 * 100, type: 'application/json' });
    const urlencodedParser = bodyParser.urlencoded({ extended: false });
    mongoose.Promise = bluebird
    app.use(jsonParser);
    app.use(bodyParser.text());
    app.use(urlencodedParser);
    app.use(express.static(modal.staticDirectory));
    bot.setDashbotId(modal.dashbotKey);
    // if(modal.push){
    //     webpush.setVapidDetails(modal.push.mailTo,modal.push.publicVapidKey,modal.push.privateVapidKey);
    // }
    // Initialize our websocket server on port
    (function () {
        console.log("Server starting to listen to port " + port);
        http.listen(port, () => { console.log("Server listening on port " + port) });
    })();

    // Init Connections
    (async function () {
        try {
            console.log("Initializing all socket connections...")
            if (cluster) {
                sub = redis.createClient(modal.redis.port,modal.redis.host);
                pub = redis.createClient(modal.redis.port,modal.redis.host);
                io.adapter(socketRedis({ host: modal.redis.host, port: modal.redis.port }));
            }
            else {
                class Listener extends EventEmitter { }
                listener = new Listener()
            }
            dbData = await setupDb();
            initListening(dbData);
            initPubSubForApis(dbData)
            initializeAllSockets(dbData);
            console.log("All internal listeners initialized");
            initCallback();
        }
        catch (e) {
            console.log(e);
        }
    })();

    function initListening(dbData) {
        app.post(`${modal.adapterPath}/:folder/:type/:stage`, async function (req, res) {
            try {
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                res.send(await require(modal.adapterDirectory + '/' + req.params.folder + '/' + req.params.type)[req.params.stage](req.body));
            }
            catch (e) {
                console.log(e);
                res.sendStatus(203);
            }
        })
        app.post("/getUserTags", async function (req, res) {
            try {
                res.json(await bot.readTags({ webId: req.body.sender }, dbData))
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500)
            }
        });

        app.post("/save", async function (req, res) {
            try {
                // console.log("SAVE::::::::::::::::::::::::::::::::::::::::::::::::::::::::")
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                res.json(await bot.save(req.body, dbData));
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500);
            }
        });

        app.post("/pre", async function (req, res) {
            try {
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                res.json(await bot.decorator(req.body, dbData));
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500);
            }
        });

        app.post("/post", async function (req, res) {
            try {
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                res.json(await bot.validator(req.body, dbData));
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500);
            }
        });

        app.post("/subscribeForPush", (req, res) => {
            // console.log("SUBSCRIBED");
            // console.log(req.body)
            try{
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                if(req.body.socketId&&req.body.id){
                    socketIdMapForBot[req.body.id.toString()] = req.body.socketId;
                    socketIdReverseMapForBot[req.body.socketId]=req.body.id.toString()
                }
                        
                // webIdToWebPushMapForBot[req.body.id]=req.body.subscription
                webIdToFirebasePushMapForBot[req.body.id]=req.body.firebaseToken
                res.status(201).json({});
            }
            catch(e){
                console.log(e)
                res.status(503);
            }
        });
        app.post("/external", function (req, res) {
            try {
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                if(req.body.projectId&&settings&&settings.projectId==req.body.projectId||settings.projectId=="untitled_project"){
                    if (cluster) {
                        pub.publish("default-web-external", JSON.stringify(req.body));
                    }
                    else {
                        listener.emit("default-web-external", req.body)
                    }
                    if(fbListener){
                        fbListener.emit("reply|fb", req.body)
                    }
                    if(mobileListener){
                        mobileListener.emit("reply|mobile", req.body)
                    }
                    if(whatsappCallback){
                        whatsappCallback(req.body);
                    }
                    res.sendStatus(200);
                }
                else{
                    res.sendStatus(500);
                }
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500);
            }
        });
        app.post("/updateTags", async function (req, res) {
            try {
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                let data = req.body
                if(req.body.passphrase&&req.body.sender&&req.body.tags&&req.body.passphrase==settings.passphraseMiddleware){
                    await bot.readAndUpdateTags({ webId: data.sender, tags: data.tags }, dbData);
                    return res.sendStatus(200);
                }
                throw new Error({status:"failed"})
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500);
            }
        });
        app.post("/webView", function (req, res) {
            try {
                if(typeof req.body=="string"){
                    req.body=JSON.parse(req.body)
                }
                if (cluster) {
                    pub.publish("default-web-webview", JSON.stringify(req.body));
                }
                else {
                    listener.emit("default-web-webview", req.body)
                }
                if(fb&&fb.processAndSend){
                    fb.processAndSend(req.body)
                }
                if(mobile&&mobile.processAndSend){
                    mobile.processAndSend(req.body)
                }
                if(whatsapp&&whatsapp.processAndSend){
                    whatsapp.processAndSend(req.body)
                }
                res.sendStatus(200);
            }
            catch (e) {
                console.log(e)
                res.sendStatus(500);
            }
        });

        app.post("/sendNotification",(req,res)=>{
                try {
                    if(typeof req.body=="string"){
                        req.body=JSON.parse(req.body)
                    }
                    if(req.body.projectId&&settings&&settings.projectId==req.body.projectId||settings.projectId=="untitled_project"){
                        
                        if (cluster) {
                            pub.publish("default-web-push-notification", JSON.stringify(req.body));
                            // console.log("PUBLISHED::default-web-push-notification")
                        }
                        else {
                            listener.emit("default-web-push-notification", req.body)
                            // console.log("PUBLISHED::default-web-push-notification")
                        }
                        if(fbListener){
                            fbListener.emit("reply|fb", req.body)
                        }
                        if(mobileListener){
                            mobileListener.emit("reply|mobile", req.body)
                        }
                        if(whatsappCallback){
                            whatsappCallback(req.body);
                        }
                        res.sendStatus(200);
                    }
                    else{
                        res.sendStatus(500);
                    }
                }
                catch (e) {
                    console.log(e)
                    res.sendStatus(500);
                }
        })
    }


    async function sendPushNotification(token,text,title){
        // console.log("Sending Push Notification..")
        // console.log(token)
        const payload = JSON.stringify({ title:title,text:text });
        if(fcmServerKey&&token){
            // console.log("firebase")
            try{
                let fcm = new FCM(fcmServerKey);
                let message = {
                    to: token,  
                    notification: {
                        title: title,
                        body: text
                    }
                };
                // console.log(JSON.stringify(message,null,3));
                let sent=await fcm.send(message)
                console.log(sent)
            }
            catch(e){
                console.log(e);
            }
        }
        // else if(webpush&&subscription){
        //     console.log("webpush")
        //     webpush
        //     .sendNotification(subscription, payload)
        //     .catch(err => console.error(err));
        // }
    }
    //Socket Connection Setup
    function initializeAllSockets(dbData) {
        // return new Promise((resolve, reject) => {
        console.log("Connecting all sockets...")
        io.on('connection', (socket) => {
            try {
                socketObjectMap[socket.id] = socket
                console.log('Socket user Connected');
                socket.on('error', function (err) {
                    console.log(err);
                    // return reject(err);
                });
                socket.on('disconnect', function () {
                    socketIdMapForBot[socketIdReverseMapForBot[socket.id]]=undefined;
                    socketIdReverseMapForBot[socket.id]=undefined;
                    socketObjectMap[socket.id]=undefined
                    console.log('Socket user Disonnected');
                });
                botProtocols(socket, dbData);
                // return resolve();
            }
            catch (e) {
                console.log(e);
                // return reject(e);
            }
        });
        // });

    }

    //Init Pub Sub
    function initPubSubForApis(dbData) {
        if (cluster) {
            sub.subscribe("default-web-external");
            sub.subscribe("default-web-webview");
            sub.subscribe("default-web-push-notification");
            sub.on("message", async function (channel, message) {
                if (channel == "default-web-external") {
                    let data = JSON.parse(message);
                    if (socketIdMapForBot[data.sender.toString()] && socketObjectMap[socketIdMapForBot[data.sender.toString()]]) {
                        socketObjectMap[socketIdMapForBot[data.sender.toString()]].emit("web-external-" + data.sender.toString(), crypter.encrypt(JSON.stringify({text:data.text,type:data.type,next:data.next})))
                    }
                }
                else if (channel == "default-web-push-notification") {
                    // console.log("LISTEN Sending Notification:::::::::::::::::")
                    let data = JSON.parse(message);
                    if (socketIdMapForBot[data.sender.toString()] && socketObjectMap[socketIdMapForBot[data.sender.toString()]]) {
                        // console.log("LISTEN 1 Sending Notification:::::::::::::::::")
                        // console.log(webIdToWebPushMapForBot)
                        socketObjectMap[socketIdMapForBot[data.sender.toString()]].emit("web-external-" + data.sender.toString(), crypter.encrypt(JSON.stringify({text:data.text,type:data.type,next:data.next})))

                        if(webIdToFirebasePushMapForBot[data.sender.toString()]){
                            // console.log("LISTEN 2 Sending Notification:::::::::::::::::")
                            sendPushNotification(webIdToFirebasePushMapForBot[data.sender.toString()],data.text,data.title||"New Message")
                        }
                    }
                }
                else if (channel == "default-web-webview") {
                    let data = JSON.parse(message);
                    if (socketIdMapForBot[data.sender.toString()] && socketObjectMap[socketIdMapForBot[data.sender.toString()]]) {
                        socketObjectMap[socketIdMapForBot[data.sender.toString()]].emit("web-webview-" + data.sender.toString(), crypter.encrypt(JSON.stringify({text:data.text})))
                        try {
                            await bot.readAndUpdateTags({ webId: data.sender, tags: data.tags, text: data.text }, dbData);
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }
                }
            });
        }
        else {
            listener.on("default-web-push-notification", async (data) => {
                // console.log("LISTEN Sending Notification:::::::::::::::::")
                if (socketIdMapForBot[data.sender.toString()] && socketObjectMap[socketIdMapForBot[data.sender.toString()]]) {
                    // console.log("LISTEN 1 Sending Notification:::::::::::::::::")
                    socketObjectMap[socketIdMapForBot[data.sender.toString()]].emit("web-external-" + data.sender.toString(), crypter.encrypt(JSON.stringify({text:data.text,type:data.type,next:data.next})))
                    if(webIdToFirebasePushMapForBot[data.sender.toString()]){
                        // console.log("LISTEN 2 Sending Notification:::::::::::::::::")
                        sendPushNotification(webIdToFirebasePushMapForBot[data.sender.toString()],data.text,data.title||"New Message")
                    }
                }
            });
            listener.on("default-web-external", async (data) => {
                if (socketIdMapForBot[data.sender.toString()] && socketObjectMap[socketIdMapForBot[data.sender.toString()]]) {
                    socketObjectMap[socketIdMapForBot[data.sender.toString()]].emit("web-external-" + data.sender.toString(), crypter.encrypt(JSON.stringify({text:data.text,type:data.type,next:data.next})))
                }
            });
            listener.on("default-web-webview", async (data) => {
                if (socketIdMapForBot[data.sender.toString()] && socketObjectMap[socketIdMapForBot[data.sender.toString()]]) {
                    socketObjectMap[socketIdMapForBot[data.sender.toString()]].emit("web-webview-" + data.sender.toString(), crypter.encrypt(JSON.stringify({text:data.text})))
                    try {
                        await bot.readAndUpdateTags({ webId: data.sender, tags: data.tags, text: data.text }, dbData);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            });
        }
    }

    //Bot Protocols
    function botProtocols(socket, dbData) {


        socket.on("web-save", async function (data) {
            try {
                data=JSON.parse(crypter.decrypt(data))
                socketIdMapForBot[data.webId.toString()] = socket.id;
                socketIdReverseMapForBot[socket.id]=data.webId.toString()
                socket.emit("web-save-" + data.webId + "-" + data.requestId, crypter.encrypt(JSON.stringify(await bot.save(data, dbData))))
            }
            catch (e) {
                console.log(e)
                socket.emit("web-save-" + data.webId + "-" + data.requestId, { error: e })
            }
        })
        socket.on("web-pre", async function (data) {
            try {
                data=JSON.parse(crypter.decrypt(data))
                socketIdMapForBot[data.webId.toString()] = socket.id;
                socketIdReverseMapForBot[socket.id]=data.webId.toString()
                socket.emit("web-pre-" + data.webId + "-" + data.requestId, crypter.encrypt(JSON.stringify(await bot.decorator(data, dbData))))
            }
            catch (e) {
                console.log(e)
                socket.emit("web-pre-" + data.webId + "-" + data.requestId, { error: e })
            }
        })
        socket.on("web-post", async function (data) {
            try {
                data=JSON.parse(crypter.decrypt(data))
                socketIdMapForBot[data.webId.toString()] = socket.id;
                socketIdReverseMapForBot[socket.id]=data.webId.toString()
                socket.emit("web-post-" + data.webId + "-" + data.requestId, crypter.encrypt(JSON.stringify(await bot.validator(data, dbData))))
            }
            catch (e) {
                console.log(e)
                socket.emit("web-post-" + data.webId + "-" + data.requestId, { error: e })
            }
        })
    }

    // DB Connection Setup
    function setupDb() {
        return new Promise((resolve, reject) => {
            try {
                console.log("Connecting Mongo db...")
                mongoose.connect(dbUrl, function (err) {
                    if (err) {
                        return reject(err)
                    }
                    console.log('Connected to mongodb!')
                    return resolve(db(mongoose));
                })
            }
            catch (e) {
                return reject(e);
            }
        });
    }

    return app;
}
