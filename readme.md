# Installation

npm install bot-middleware-jubi --save


## Usage
Initializing a Server. You need to have Mongo Db endpoints. (Web by default)
```
 require("bot-middleware-jubi").Server({
    root:"https://yourdomain.com/path",
    socketDomain: "wss://yourdomain.com",
    socketPath: '/path/socket',
    socketLocalPath: '/socket',
    httpPort:4000,
    cluster:false,
    dbUri:'mongodb://root:root@127.0.0.1:27017/pigaro',
    staticDirectory:__dirname+"/static",
    adapterPath:"/adapter",
    adapterDirectory:__dirname+"/adapter",
    projectId:"myproject_100911645983",
    dashbotKey:"VxtYPVW6168LIiXwqpIku9wE",
    directMultiplier:1,
    fallbackMultiplier:0.8,
    passphraseMiddleware:"YGUYGgyjgblgUGIYGIGkwhbiuashbo98u9283hr9h24rqIYGI932kbidbiadsYE",
    timeoutSeconds:60,
    fcmServerKey:"AAAAYTZC9WQ:APA91bFRmKa",
    firebaseWebConfig:{
        apiKey: "sd-ZrO9xKQ",
        authDomain: "on-f31.firebaseapp.com",
        databaseURL: "https://on-f31.firebaseio.com",
        projectId: "on-f31",
        storageBucket: "",
        messagingSenderId: "4175221234234"
    }
},()=>{
    //TO DO AFTER INITIALIZATION
})
```
Initializing the Cluster. You need to have Redis and Mongo Db endpoints.
```
 require("bot-middleware-jubi").Server({
    root:"https://yourdomain.com/path",
    socketDomain: "wss://yourdomain.com",
    socketPath: '/path/socket',
    socketLocalPath: '/socket',
    httpPort:4000,
    cluster:true,
    redis:{
        host:'127.0.0.1',
        port:6379
    },
    dbUri:'mongodb://root:root@127.0.0.1:27017/pigaro',
    staticDirectory:__dirname+"/static",
    adapterPath:"/adapter",
    adapterDirectory:__dirname+"/adapter",
    projectId:"myproject_100911645983",
    dashbotKey:"VxtYPVW6168LIiXwqpIku9wE",
    directMultiplier:1,
    fallbackMultiplier:0.8,
    passphraseMiddleware:"YGUYGgyjgblgUGIYGIGkwhbiuashbo98u9283hr9h24rqIYGI932kbidbiadsYE",
    timeoutSeconds:60,
    fcmServerKey:"AAAAYTZC9WQ:APA91bFRmKa",
    firebaseWebConfig:{
        apiKey: "sd-ZrO9xKQ",
        authDomain: "on-f31.firebaseapp.com",
        databaseURL: "https://on-f31.firebaseio.com",
        projectId: "on-f31",
        storageBucket: "",
        messagingSenderId: "4175221234234"
    }
 },()=>{
    //TO DO AFTER INITIALIZATION
})
```
For Facebook initialization
```
 //TO DO AFTER INITIALIZATION
 require("bot-middleware-jubi").facebook({
     verificationToken:"verify",
     pageAccessToken:"EAAC0860ccOEBAP3189NahL5IUkeqo7",
     path:"/fb"
 })
```
For Twilio Whatsapp initialization
```
 //TO DO AFTER INITIALIZATION
 require("bot-middleware-jubi").whatsapp({
     accountSid: "AC42dssdsdsdb3e80023",
     authToken: "4295006bsd98c6d6a",
     path: "/whatsapp",
     number:"whatsapp:+919999999999"
 })
```
For Firebase Mobile initialization
```
 //TO DO AFTER INITIALIZATION
 require("bot-middleware-jubi").mobile({
     fcmKey: "sdsad23423423dw",
     path: "/mobile"
 })
```
Creating adapter folders for apis
```
 require("bot-middleware-jubi").createAdapter("intent",{
     operationFileNames:{
         validate:"post",
         decorate:"pre"
     },
     adapterDirectory:__dirname+"/adapter"
 })
```
Creating frontend folders for static files
```
 require("bot-middleware-jubi").createFrontend({
    root:"https://yourdomain.com/path",
    socketDomain: "wss://yourdomain.com",
    socketPath: '/path/socket',
    staticDirectory:__dirname+"/static",
    projectId:"myproject_100911645983",
    passphraseMiddleware:"YGUYGgyjgblgUGIYGIGkwhbiuashbo98u9283hr9h24rqIYGI932kbidbiadsYE",
    firebaseWebConfig:{
        apiKey: "AIzaSyAAqVdFN_8wbXK4W_YLZj2q6rF-ZrO9xKQ",
        authDomain: "push-notification-f31b9.firebaseapp.com",
        databaseURL: "https://push-notification-f31b9.firebaseio.com",
        projectId: "push-notification-f31b9",
        storageBucket: "",
        messagingSenderId: "417522185572"
    },
    iconPath:"/icon.png"
 })
```
Creating VAPID Public and Private Keys
```
const vapidKeys=require("bot-middleware-jubi").createVAPIDKeys()
```
