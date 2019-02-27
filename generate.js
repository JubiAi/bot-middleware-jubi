module.exports={
	buildPWAFiles:buildPWAFiles,
	buildLoaderFile:buildLoaderFile,
	buildHTMLFile:buildHTMLFile,
	buildThemeFile:buildThemeFile

}

function buildPWAFiles(firebaseConfig,domainName,projectId,iconPath){
    let name=projectId
    if(projectId.includes("_")){
        name=projectId.split("_")[0]
    }
    let manifest=`{
        "name": "${name} bot",
        "short_name": "${name}",
        "theme_color": "#000000",
        "background_color": "#ffffff",
        "display": "standalone",
        "orientation": "portrait",
        "Scope": "/",
        "start_url": "/",
        "icons": [],
        "gcm_sender_id": "103953800507",
        "splash_pages": null
    }`
    let pwaJs=`
    if("serviceWorker" in navigator){
        try{
            send();

        }
        catch(e){
            console.log(e);
        }
    }


    

    async function send() {
        const register = await navigator.serviceWorker.register("sw.js", {
            scope: "/"
        });

    }



  // Initialize Firebase
      const config = {
        apiKey: "${firebaseConfig.apiKey}",
        authDomain: "${firebaseConfig.authDomain}",
        databaseURL: "${firebaseConfig.databaseURL}",
        projectId: "${firebaseConfig.projectId}",
        storageBucket: "${firebaseConfig.storageBucket}",
        messagingSenderId: "${firebaseConfig.messagingSenderId}"
      };

        runFirebase()
        .then(runSubscription)
        .catch(err => console.error(err));

      function runFirebase(){
        return new Promise(async (resolve,reject)=>{
            try{
                firebase.initializeApp(config);
                const messaging = firebase.messaging();
                await messaging.requestPermission()
                messaging.onMessage(function(payload){
                    console.log("onMessage: ",payload)
                });
                let token = await messaging.getToken()
                // console.log(token)
                return resolve(token)
            }
            catch(e){
                console.log(e)
                return reject(e)
            }
        })
          
    }

    function runSubscription(firebaseToken){
        if(window.subscriptionForWebId.getWebId()){
            console.log("Subscribed")
            subscribeForPushNotification(window.subscriptionForWebId.getWebId(),firebaseToken);
        }
        else{
            setTimeout(()=>{
                    runSubscription(window.subscriptionForWebId.getWebId(),firebaseToken)
            },2000);
        }
    }

    

    async function subscribeForPushNotification(webId,firebaseToken){

        let data={
            id:webId,
            socketId:window.socketId,
            firebaseToken:firebaseToken
        }
        await fetch('${domainName}/subscribeForPush', {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },
            mode:"no-cors",
            credentials: 'omit'  
        });
    }


    


    `
    let swJs=`
        importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.6.1/workbox-sw.js');

        if (workbox) {
            console.log("Yay! Workbox is loaded 🎉");
        } else {
            console.log("Boo! Workbox didn't load 😬");
        }

        const matchFunction = ({url, event}) => {
            if(url && url.href&&url.href.includes("socket")&&url.host!="cdnjs.cloudflare.com"){
                return false;
            }
            return true;
        };
        workbox.routing.registerRoute(
            matchFunction,
            workbox.strategies.networkFirst()
        );


    
        self.addEventListener("push", e => {
            const data = e.data.json();
            console.log("Push Recieved...");
            self.registration.showNotification(data.title, {
                body: data.text,
                icon: "${domainName}${iconPath}"
            });
        });

        self.addEventListener('notificationclick', function(event) {
          event.notification.close();
          event.waitUntil(
            clients.openWindow("${domainName}")
          );
        })

    `

    let firebase=`
        importScripts("https://www.gstatic.com/firebasejs/5.7.2/firebase-app.js")
        importScripts("https://www.gstatic.com/firebasejs/5.7.2/firebase-messaging.js")

      // Initialize Firebase
          const config = {
            apiKey: "${firebaseConfig.apiKey}",
            authDomain: "${firebaseConfig.authDomain}",
            databaseURL: "${firebaseConfig.databaseURL}",
            projectId: "${firebaseConfig.projectId}",
            storageBucket: "${firebaseConfig.storageBucket}",
            messagingSenderId: "${firebaseConfig.messagingSenderId}"
          };

         
            runFirebase()
            .catch(err => console.error(err));

          function runFirebase(){
            return new Promise(async (resolve,reject)=>{
                try{
                    firebase.initializeApp(config);
                    const messaging = firebase.messaging();
                    messaging.setBackgroundMessageHandler(function(payload) {
                      var notificationTitle = 'Got a new Message';
                      var notificationOptions = {
                        body: 'Click to open',
                        icon: 'https://newparramato.herokuapp.com/icon.png'
                      };

                      return self.registration.showNotification(notificationTitle,
                        notificationOptions);
                    });
                    let token = await messaging.getToken()
                    // console.log(token)
                    return resolve(token)
                }
                catch(e){
                    console.log(e)
                    return reject(e)
                }
            })
              
        }

    
    `
    return {manifest:manifest,pwa:pwaJs,sw:swJs,firebase:firebase}
}
function buildLoaderFile(projectId,socketUrl,socketPath,passphraseMiddleware,devUrl){
    return `
        "use strict";
            (function () {
                function loadJs(jsUrls) {
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = Object.keys(jsUrls)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var key = _step.value;

                            var _url = jsUrls[key];
                            if (!isMyScriptLoaded(_url)) {
                                document.writeln("<script type='text/javascript' src='" + _url + "'></script>");
                            }
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator.return) {
                                _iterator.return();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }
                }
                function isMyScriptLoaded(url) {
                    var scripts = document.getElementsByTagName('script');
                    for (var i = scripts.length; i--;) {
                        if (scripts[i].src == url) return true;
                    }
                    return false;
                }

                function isMyCssLoaded(url) {
                    var scripts = document.getElementsByTagName('link');
                    for (var i = scripts.length; i--;) {
                        if (scripts[i].src == url) return true;
                    }
                    return false;
                }
                function loadCss(cssUrls) {
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = Object.keys(cssUrls)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var key = _step2.value;

                            var _url2 = cssUrls[key];
                            if (!isMyCssLoaded(_url2)) {
                                var head = document.getElementsByTagName('head')[0];
                                var link = document.createElement('link');
                                link.rel = 'stylesheet';
                                link.type = 'text/css';
                                link.href = _url2;
                                link.media = 'all';
                                head.appendChild(link);
                            }
                        }
                    } catch (err) {
                        _didIteratorError2 = true;
                        _iteratorError2 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                                _iterator2.return();
                            }
                        } finally {
                            if (_didIteratorError2) {
                                throw _iteratorError2;
                            }
                        }
                    }
                }
                loadCss({
        bootstrapFont: "https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css",
        muliFont: "https://fonts.googleapis.com/css?family=Muli:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i",
        owl: "https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.css",
        bootstrap: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css",
        owlTheme: "https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.theme.default.min.css",
        pmTheme: "./theme.css"
    });
    loadJs({
        crypt: "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js",
        jQuery: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js",
        bootstrap: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js",
        carousel: "https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js",
        socket: "https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.1/socket.io.js",
        responsiveVoice :"https://code.responsivevoice.org/responsivevoice.js",
        nluComponent:"https://unpkg.com/compromise@latest/builds/compromise.min.js",
        bundle: "${devUrl}/${projectId}/dev/js/bundle.js"
    });
                window.directMultiplier=1;
            window.fallbackMultiplier=0.8;
            window.speechOnBrowser="Hindi Female"
            window.speechGenderBackend="FEMALE"
            window.speechLanguageCodeBackend="en-US"
            window.jubiUrl='${devUrl}/${projectId}/dev/';
            window.jubiModal={
                url:'${socketUrl}',
                path:'${socketPath}',
                static:{
                    url:window.jubiUrl,
                    scripts:{
                    },
                    css:{
                    },
                    images:{"logo":"${devUrl}/${projectId}/dev/images/logo.png","sendIcon":"${devUrl}/${projectId}/dev/images/icon_send.png","sendIconActive":"${devUrl}/${projectId}/dev/images/iconRed_send.png","loaderBotChat":"${devUrl}/${projectId}/dev/images/response-loading.gif","userIcon":"${devUrl}/${projectId}/dev/images/user.png","botIcon":"${devUrl}/${projectId}/dev/images/boticon.png","logoIcon":"${devUrl}/${projectId}/dev/images/logo-icon.png","voiceIcon":"${devUrl}/${projectId}/dev/images/voice.png","closeWebView":"${devUrl}/${projectId}/dev/images/closeWebView.png","attachment":"${devUrl}/${projectId}/dev/images/attachment.png","permissionIcon":"${devUrl}/${projectId}/dev/images/parrot_loader.gif"},
                    text:{
                        closeMessage:'',
                        headMessage:'Ask me anything.'
                    }
                }
            };
            window.passphraseMiddleware="${passphraseMiddleware}"
            window.voiceEnable=true;
            window.chatPersistence = true;
                window.mainpage =   '<section class="sec_main" id="jubisecmain" style="display: none;"></section>';
                window.leftpanel =  '<div class="leftPage" id="leftpanel"><div class="leftpanelBg"><div class="leftpage_opacity">&nbsp</div></div><div class="leftContent"><div class="logo"><img src="${devUrl}/${projectId}/dev/images/logo.png" class="img-fluid" ></div><h2>Ask me anything.</h2></div></div>';   
                window.rightpanel = '<div class="rightPage" id="rightpanel"><section class="jubichatbot" id="jubichatbot" style="display: none;"></section></div>';
                window.templateOpenView = '<section class="pm-sec_calliframe" id="pm-secIframe"  style="display:none">'+
                '<section class="pm-sec_scroll2 pm-sec_openview" id="pm-mainSec">' + 

                    '<section id="pm-heading" class="pm-sec_newHeader">'+
                        '<div class="pm-titleheader" >'+
                            '<h3>'+
                                '<img src="${devUrl}/${projectId}/dev/images/logo-icon.png" class="img-responsive"><span class="pm-headOnline" >&nbsp;</span>'+
                            '</h3>'+
                        '</div>'+
                        '<p>Ask me anything.</p>'+
                    '</section>'+

                    '<section class="pm-sec_chatbody" id="pm-data" >'+
                        '<div class="pm-bxChatbox pm-bxChat chatWindow" id="pm-buttonlock">'+
                        '</div>'+
                    '</section>'+


                    '<div id="jubi-recording-text">'+
                        '<p id="jubi-result-text">'+
                            '<span class="jubi-grey-text"><span>'+
                        '</p>'+
                    '</div>'+

                    '<section id="pm-textInput" class="pm-sec_newFooter footer-one" style="float:left;width:100%;display:none;">'+
                        '<div class="inputArea">'+
                            '<div class="pm-bxform">' +
                                '<div class="pm-bxinput">' +
                                    '<textarea id="pm-answerBottom" placeholder="Type a message here..." style="resize:none;overflow:hidden;" autofocus></textarea>' +
                                '</div>' +
                                '<button id="pm-bottomClick" type="submit" onclick="return false;">'+
                                    '<img src="${devUrl}/${projectId}/dev/images/icon_send.png" id="graySend" class="img-responsive" style="display: block;">'+
                                '</button>'+
                                '<div class="uploadbox">' +
                                    '<label>' +
                                        '<div class="inputfile">' +
                                            '<img src="${devUrl}/${projectId}/dev/images/attachment.png" class="img-responsive">' +
                                            '<input class="jubi-file-upload" type="file" name="fileName" >' +
                                        '</div>' +
                                        '<div class="button-section" style="display:none">' +
                                            '<button type="submit">Submit</button>' +
                                        '</div>' +
                                    '</label>'+
                                '</div>' +
                            '</div>' +
                        '</div>'+

                        '<div class="jubi-new_copyright" id="jubi-new_copyright">' +
                            'Powered by <a href="https://www.jubi.ai/" target="_blank">jubi.ai</a>' +
                        ' </div>' +
                    '</section> ' +

                    '<section id="jubi-textInput" class="jubi-sec_newFooter footer-two" style="float:left;width:100%;">'+

                        '<aside class="jubi-muteUnmuteVoice">'+
                            '<div id="jubi-unmuteVoice">'+
                                '<img src="${devUrl}/${projectId}/dev/images/unmute.png">'+
                            '</div>'+
                            '<div id="jubi-muteVoice">'+
                                '<img src="${devUrl}/${projectId}/dev/images/mute.png">'+
                            '</div>'+
                        '</aside>'+
                    
                    
                        '<div class="voice-buttons" id="voice-buttons">'+
                            '<div class="voiceIcon" id="button-play-ws">'+
                                '<img src="${devUrl}/${projectId}/dev/images/voice.png" class="img-fluid">'+
                            '</div>'+
                            '<div class="voicePulse" id="button-stop-ws">'+
                                '<div class="sk-three-bounce">'+
                                    '<div class="sk-child sk-bounce1"></div>'+
                                    '<div class="sk-child sk-bounce2"></div>'+
                                    '<div class="sk-child sk-bounce3"></div>'+
                                '</div>'+
                                '<div class="stop-recording">Listening...</div>'+
                            '</div>'+
                        '</div>'+
                        '<div class="jubi-bxinput" id="jubi-bxinput" style="display:none;">'+
                            '<textarea id="jubi-answerBottom" placeholder="Type a message here..." style="resize:none;overflow:hidden;" autofocus></textarea> '+
                        '</div>'+
                        '<div class="datasendButtons">'+
                            '<div class="sendIcon" id="button-send">'+
                                '<button id="jubi-bottomClick" type="submit" onclick="return false;">'+
                                    '<img src="${devUrl}/${projectId}/dev/images/icon_send.png" id="jubi-graySend" class="img-responsive" style="display: block;">'+
                                    '<img src="${devUrl}/${projectId}/dev/images/iconRed_send.png" id="jubi-redSend" class="img-responsive" style="display: none;">'+
                                '</button>'+
                                
                            '</div>'+
                            '<div class="uploadbox">' +
                                '<label>' +
                                    '<div class="inputfile">' +
                                        '<img src="${devUrl}/${projectId}/dev/images/attachment.png" class="img-responsive">' +
                                        '<input class="jubi-file-upload" type="file" name="fileName" >' +
                                    '</div>' +
                                    '<div class="button-section" style="display:none">' +
                                        '<button type="submit">Submit</button>' +
                                    '</div>' +
                                '</label>'+
                            '</div>' +
                            '<div class="keyboard-icon" id="keyboard-icon" >'+
                                '<i class="fa fa-keyboard-o" aria-hidden="true"></i>'+
                            '</div>'+        
                        '</div>'+
                        '<div class="jubi-new_copyright" id="jubi-new_copyright">' +
                            'Powered by <a href="https://www.jubi.ai/" target="_blank">jubi.ai</a>' +
                        ' </div>' +
                    '</section>'+
                '</section>' +       
            '</section>';
                window.loadPermissionView = 
    '<section id="pm-permission-view" style="display:none" >'+
        '<section id="pm-heading" class="pm-sec_newHeader">'+
            '<div class="pm-titleheader" >'+
                '<h3>'+
                    '<img src="${devUrl}/${projectId}/dev/images/logo-icon.png" class="img-responsive"><span class="pm-headOnline" >&nbsp;</span>'+
                '</h3>'+
            '</div>'+
            '<p>Ask me anything.</p>'+
        '</section>'+
        '<section class="pm-sec_show_option_on_start" id="pm-sec_show_option_on_start" style="display:block">'+         
            '<div class="chatProceed" id="chatProceed">'+
                '<div class="chatProceed-botimg">'+
                    '<img src="${devUrl}/${projectId}/dev/images/parrot_loader.gif" class="img-responsive">'+
                '</div>'+
                '<p>Welcome back! Let us begin...</p>'+
                '<ul>'+
                    '<li>'+
                        '<a href="javascript:void(0)" id="jubi-continue-storage" >Continue from where we left</a>'+
                    '</li>'+
                    '<li>'+
                        '<a href="javascript:void(0)" id="jubi-start-fresh">Start fresh</a>'+
                    '</li>'+
                '</ul>'+
            '</div>'+
        '</section>'+
    '</section>';
    
            })();
            
    `
}
function buildHTMLFile(iconPath,headerCode){
    return `
    
    <!DOCTYPE html>
    <html lang="en" class="ios iphone mobile landscape">
    <head>
        <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
            <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />        
            <title></title>      
            <meta property="og:title" content="bankbazaarbot"/>
            <meta property="og:type" content="Powered By Jubi" />

            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-status-bar-style" content="default">
            <meta name="apple-mobile-web-app-title" content="bot">

            <link rel="apple-touch-icon" href=".${iconPath}">
            <link rel="apple-touch-startup-image" href=".${iconPath}">
            ${headerCode}

            <link rel="manifest" href="./manifest.json" >
        </head>
        <body >   
              
            <script src="https://www.gstatic.com/firebasejs/5.7.2/firebase.js"></script>
            <script type="text/javascript"  src="./loader.js"></script>
            <script type="text/javascript" src="./pwa.js"></script>  
            <div id="jubi-chat-loader-app"></div> 
        </body>
    </html>`
}
function buildThemeFile(projectId){

    return `

	   
 body{
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
 }
 .pm-sec_calliframe iframe { box-sizing: border-box; width: 100%!important; height: 100%; overflow: hidden; box-sizing: border-box; }
 .pm-btnClose { float: right; width: 30px; height: 15px; color: #16bdcd;text-align: right; }
 .pm-secCloseMsg p { width: 100%; float: left; margin: 0px; line-height: 18px; font-size: 14px; } 
 .pm-btnClose .fa:hover { color: #f00; }
 .pm-innerNotification { position: absolute;top: -8px; right: -7px; width: 20px; height: 20px; background: #fff; border-radius: 50%; text-align: center; font-size: 13px;font-weight: bold; box-shadow: 0 1px 1px 0px #ccc; color: #16bdcd; }
 .pm-btnClose .fa { font-size: 12px; }
 #slider .container-fluid{
 padding: 0 15px;
 }
 #slider .slider-inner{
 padding: 0;
 }
 .slider-inner .item img{
 display: block;
 width: 100%;
 height: auto;
 }
 .slider-inner h1{
 color: purple;
 }
 
 .wrapper{ width:70%; }
 @media(max-width:992px){ 
 .wrapper{ width:100%; }
 }
.pm-panel-heading{padding:0;border:0}
.pm-panel-title>a,.panel-title>a:active{display:block;padding:15px;color:#252525;font-size:13px;text-decoration:none}
.pm-panel-heading a:before{font-family:'Glyphicons Halflings';content:"\e114";float:right;transition:all .5s;font-size:11px}
.pm-panel-heading.active a:before{-webkit-transform:rotate(180deg);-moz-transform:rotate(180deg);transform:rotate(180deg)}
.pm-sec_dropdown .panel-default > .panel-heading { background:#fff; }
.pm-titleQuestion {text-align: center; font-size: 15px; margin: 0 0 10px 0; color: #585858; }
.pm-secMain { padding: 0px 0 50px; position: relative; z-index: 9; margin-top: 30px;float: left;
 width: 100%; }
.pm-bxSentdate {text-align:center;margin:35px 0 55px;}
.pm-bxSentdate p {background: #136bb0;padding: 2px 23px; color: #fff; width: auto; margin: 0 auto; display: inline-block; border-radius: 5px;}
.pm-leftInput {position: relative;margin-bottom: 0px;}
.pm-bxloadgif img {width: 16px; }
.pm-pointLeftchat {position:absolute;bottom: -26px; left: -7px;display: none;}
.pm-pointLeftchat img { width: 35px;}
.pm-leftUserimg { width: 40px;height: 40px;border-radius: 50%; float: left;position: absolute;}
.pm-bxRightchat { float: right; margin: 0px 0 25px; width:100%; }
.pm-rightInput p {margin: 0; color: #252525; font-size: 15px; }
.pm-typeImgDots { float: left; border: 1px solid #ccc; padding: 7px 0px 0 5px; width: 41px;height: 40px; border-radius: 50%; margin-right: 5px;}
.pm-typeImgDots img { width: 29px;}
.pm-userInputbx .form-inline .form-control { background: none;color: #949494;border: 1px solid #6ed4f3;}
.pm-bxCheckOPtionUrl {width:100%;text-align:center; }
.pm-bxCheckOPtionUrl ul {padding:0; text-align:center; margin-bottom: 15px;}
.pm-bxCheckOPtionUrl ul li {display:inline-block;margin-right: 18px;margin-bottom: 9px;}
.pm-bxCheckOPtionUrl ul li p {min-width: 193px; transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s; margin-right: 10px; } 
.pm-bxCheckOPtionUrl ul li p:hover {box-shadow: 1px 1px 9px 0px rgba(76, 76, 76, 0.55);background: #136bb0;color: #fff;border:1px solid #fff;cursor:pointer; border: 3px solid #136bb0; }
.pm-bxCheckOPtionUrl ul li a { display: inline-block; text-decoration: none !important; min-width: 193px; color: #136bb0;
 font-size: 15px; padding: 9px 18px; transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s;
 background: rgba(255, 255, 255, 0.68); border-radius: 12px; border: 1px solid #136bb0; }
.pm-bxCheckOPtionUrl ul li a:hover, .pm-bxCheckOPtionUrl ul li a:active, .pm-bxCheckOPtionUrl ul li a:focus { background: #136bb0; color: #fff; border: 1px solid #136bb0; }
.pm-bxCheckOPtionUrl ul li:last-child { margin-right: 0px;}
.pm-bxCheckOPtion, .pm-bxCheckOPtionPersist {width:100%;text-align:center; }
.pm-bxCheckOPtion ul, .pm-bxCheckOPtionPersist ul {padding:0; text-align:center; margin-bottom: 15px;
 width: 100%;
 float: left;
}
.pm-bxCheckOPtion ul li, .pm-bxCheckOPtionPersist ul li {display:inline-block;margin-right: 4px;
 margin-bottom: 0px;
 margin-bottom: 4px;}
.pm-bxCheckOPtion ul li p, .pm-bxCheckOPtionPersist ul li p {min-width: 193px; transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s; margin-right: 10px; }  
.pm-bxCheckOPtion ul li p:hover, .bxCheckOPtionPersist ul li p:hover {box-shadow: 1px 1px 9px 0px rgba(76, 76, 76, 0.55);background: #136bb0;color: #fff;border:1px solid #fff;cursor:pointer; border: 3px solid #136bb0; }
.pm-bxCheckOPtion ul li a, .pm-bxCheckOPtionPersist ul li a { display: inline-block;
 text-decoration: none !important;
 color: #136bb0;
 font-size: 14px;
 text-decoration: none;
 transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s;
 background: #fff;
 border-radius: 9px;
 border: 1px solid #136bb0;min-width: auto; padding: 6px 13px;
 transition: background 2s;
 -webkit-transition: background 2s;
}

.pm-bxCheckOPtionPersist ul li a:hover, .pm-bxCheckOPtion ul li a:hover {
 color: #fff;
 border: 1px solid transparent;
 opacity: 1;
 background: #136bb0;
}
.pm-bxText {float:left;}
.pm-bxBtnsend {float: left; width: 35px; height: 35px; border: 1px solid #ccc; padding: 9px 8px 0 11px; border-radius: 50%;margin-left: 10px;}
.pm-bxBtnsend .imgSend {width: 100% ; height:auto;}
.pm-rightUserimg {right: -45px; left: auto; z-index: 0;}
.pm-leftInput p { margin:0px; font-size: 15px; display: inline-block; }
.pm-bxLeftchat {position:relative;margin-top: 0px;margin-bottom: 33px;float: left;}
.pm-bxRightchat {position:relative;}
.pm-rightUserimg {width: 30px; height: 30px; overflow: hidden; border-radius: 50%;
 text-align: center; position: absolute; right: 0px;border: 1px solid #ccc;padding: 0px; top: 2px; }
.pm-rightUserimg img { margin: 0 auto; padding: 0; width: 100%; }
.pm-bxloadgif { margin:0px 0 0px; }
.pm-innerloadgif { margin-left: 38px;
 width: 69px;
 margin-top: 0px;
 margin-bottom: 14px;
 background: #f4f8f7;
 padding: 8px 0px;
 text-align: center;
 border-radius: 18px 18px 18px 0;
 background: rgb(244, 248, 247); }
.pm-postImg {max-width: 300px; border-radius: 23px;}
.pm-postImg img {width:100%; border-radius: 9px 9px 9px 4px;max-width: 210px;}
.pm-leftPostImages {margin-top:120px;}
.pm-bxLeftchat { margin-bottom: 4px;float: left; width: 100%;}
.pm-bxRightchat .input-lg { border-radius: 14px 14px 0px 14px; height: auto; padding: 5px 16px; font-size: 16px; border: 0px; color: #000;}
.pm-bxRightchat .input-lg:place-holder {color:#000; }
.pm-bxCheckOPtion ul li:last-child { margin-right: 0px; }
 #pm-bottom { position: fixed; bottom: 0px; width: 750px; background: #ffffff; z-index: 999999; } 
.pm-bxinput { width: 100; margin: 0 auto; height:90%;position: relative; }
.pm-bxinput input[type="text"]::-webkit-input-placeholder { /* Chrome/Opera/Safari */
 font-size: 11px; }
.pm-bxinput input[type="text"]::-moz-placeholder { /* Firefox 19+ */
 font-size: 11px; }
.pm-bxinput input[type="text"]:-ms-input-placeholder { /* IE 10+ */
 font-size: 11px; }
.pm-bxinput input[type="text"]:-moz-placeholder { font-size: 11px; }
.pm-bxinput input:focus { border: 0px;outline: -webkit-focus-ring-color auto 0px; }
 #pm-bottom input { border: 0px solid #d7d7d7;background: none;
 padding: 8.85px; width: 87%; border-radius: 5px 0 0 5px; font-size:15px;float: left; }
 #pm-bottom button:hover {background: none; color: #fff;border: 0;}
 #pm-bottom button:focus { outline: -webkit-focus-ring-color auto 0px; }
.pm-sec_video_baner { position: absolute; width: 100%; }
.pm-textcenter{ position: relative; z-index: 99999; }
footer {background: #f8f8f8; text-align: center; padding: 8px 0; position: fixed; width: 100%; left: 0; bottom: 0; z-index: 9; border-top: 1px solid #ececec; }
footer p {text-align: right;margin: 0; font-size: 12px; }
footer a{text-decoration: none; color: #000; font-weight: bold; font-size: 12px; }
footer a:hover {text-decoration: none; color: #20354d; }
.pm-bxsocial a {float: left; text-decoration: none; }
.pm-bxsocial { float: left; margin-top: 9px; }
.pm-bxgetthefull { float: left;margin-left: 13px; margin-top: 12px; }
.pm-bxgetthefull a { display: inline-block; text-decoration: none !important; color: 20354d; font-size: 12px; padding: 5px 9px; transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s; background: rgba(255, 255, 255, 0.68); border-radius: 21px; border: 2px solid #d7d7d7;}
.pm-bxgetthefull a:hover { background: #20354d; color: #fff; border: 2px solid #20354d; }
.pm-share p { margin: 0; color: #20354d; }
.pm-bxsocial .fa {font-size: 20px;margin-left: 7px; color: #d7d7d7;}
.pm-bxsocial .fa:hover {color: #20354d; }
.pm-share span { line-height: 20px; display: block; float: left; color: #565656; font-size: 13px; }
.pm-sec_slider {margin-bottom: 13px; margin-top: 10px; }
.pm-slideImage {width: 100%;border: 1px solid #e7e7e7;overflow: hidden; }
.pm-sliderContent { width: 100%;
 border: 0px solid #e7e7e7;
 padding: 0px 28px;
 padding: 0px 0px 15px;
 border-bottom: 0; }
.pm-sliderContent h5{ font-weight: 700;
 color: #00305a;
 text-align: left;
 font-size: 13px;
 height: 46px;
 overflow: hidden;
 margin-bottom: 6px;
 padding: 4px 10px 0px;
 border-bottom: 0px solid #ececec;
 margin: 0px 0 0; }
.pm-bxslidebtn a, .pm-sliderContent p{font-size:12px;}
.pm-sliderContent p {min-height: 59px;
 margin: 0 0 1px;
 color: #383838;
 max-height: 63px;
 overflow: hidden;
 padding: 8px 10px 0;
}
.pm-bxslidebtn{ width: 100%;
 border-top: 0;
 padding: 0 5px 0 0;
 text-align: right;height: 31px;
 margin: 8px 0 6px 0;
 text-align: center;
 overflow: hidden; }
.pm-bxslidebtn a { vertical-align: bottom;
 width: 100%;
 color: #20354d;
 border-top: 0;
 margin-bottom: 0;
 padding: 5px 13px;
 font-weight: 600;
 text-align: right;
 background: #fff;
 text-transform: uppercase;
 font-weight: bold;
 box-shadow: rgb(215, 220, 219) 0px 1px 2px 0px;
 border-radius: 3px;
 font-size: 10px; }
.pm-bxslidebtn a:hover, .bxslidebtn a:focus {text-decoration: none;background: #7c41ef; color: #fff;}
.pm-bxCheckOPtion { margin-top: 0px;float: left; }
.pm-sec_slider .bx-wrapper img { margin: 0 auto; }
.pm-sec_slider .bx-controls-direction { display: block; }
.pm-sec_slider .bx-wrapper .bx-pager { display: none; bottom: -2px; }
.pm-sec_slider .bx-wrapper .bx-pager.bx-default-pager a:hover, .bx-wrapper .bx-pager.bx-default-pager a.active { background: #20354d; }
.pm-sec_slider .bx-wrapper .bx-pager.bx-default-pager a, .bx-wrapper .bx-pager.bx-default-pager a {
 background: #20354d; }
.pm-bxsocial .btn { color: #000; border: 0; background-color: #ffffff;background-image:none;text-shadow: 0 0 0 #000; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .15), 0 1px 1px rgba(0, 0, 0, .075); }
.pm-bxsocial .btn.active.focus, .pm-bxsocial .btn.active:focus, .pm-bxsocial .btn.focus, .pm-bxsocial .pm-btn:active.focus, .pm-bxsocial .btn:active:focus, .pm-bxsocial .btn:focus { outline: 0px auto -webkit-focus-ring-color; outline-offset: 0px; }
.pm-bxsocial .dropdown-menu { padding: 0px 0; margin: 0px 0 0; box-shadow: 0 1px 5px rgba(0,0,0,.175); border: 1px solid rgba(213, 213, 213, 0.15); border-radius: 4px; }
.pm-bxsocial .dropdown-menu>li>a { padding: 3px 0 3px 5px; width: 100%; border-bottom: 1px solid #d8d8d8; }
.pm-bxsocial .dropdown .fa { font-size: 15px; margin-left: 4px; margin-right: 4px; }
.pm-bxsocial .dropdown-menu>li>a:hover { color: #fff;}
.pm-bxsocial .dropdown-menu>li>a:hover .fa { color: #fff;}
.pm-bxsocial .dropdown-menu > li > a:hover, .pm-bxsocial .pm-dropdown-menu > li > a:focus { background-color: #20354d; background-image: none; }
.pm-bxsocial .btn:hover { color: #fff; background-color: #20354d;}
.bxsocial .btn:hover .fa {color: #fff; }
.dropdown:hover .dropdown-content { display: block; }
.pm-sec_slider .bx-wrapper .bx-controls-direction a { top: 50%; transition-delay: 5s;}
.pm-sec_slider .bx-wrapper .bx-controls-direction a.bx-prev { left: 0px; }
.pm-sec_slider{width:100%;overflow:hidden;position:relative;float:left;-moz-transition:opacity 3s ease-in-out;-o-transition:opacity 3s ease-in-out;-webkit-transition:opacity 3s ease-in-out;transition:opacity 3s ease-in-out}
.bx-wrapper .bx-controls{display:block}
.bx-wrapper .bx-viewport .bx-controls{display:none!important}
.pm-sec_slider .bx-wrapper .bx-controls-direction a.bx-prev{left:9px;background:url(../images/arrowLeft.png) center no-repeat #fff;z-index:0;background-size:8px;opacity:1;width:22px;height:22px;padding:5px;border:1px solid #eaeaea}
.pm-sec_slider .bx-wrapper .bx-controls-direction a.bx-next{right:10px;background:url(../images/arrowRight.png) center no-repeat #fff;background-size:8px;opacity:1;width:22px;height:22px;z-index:0;padding:5px;border:1px solid #eaeaea}
.pm-sec_slider .bx-wrapper .bx-viewport { width: 100% !important; margin: 0 auto; background: none; }
.pm-sec_slider .bx-wrapper .bx-viewport li { background: #fff; box-shadow: 0px 1px 2px 0px #d7dcdb; }
.pm-sec_slider .bx-wrapper .bx-viewport .bx-viewport { width: 100% !important; }
.pm-main { padding-top: 10px; }
.pm-sec_dropdown .panel-group .panel+.panel { margin-top: 3px; box-shadow: 0 0 0; border-radius: 0; }
.pm-sec_dropdown .panel-title>a, .panel-title>a:active { padding: 13px 11px; font-size: 12px; }
.pm-leftInput_new {margin: 0px;width: 100%;}
.pm-sec_dropdown .panel-body { padding: 6px;font-size: 12px;color: #424242; }
.pm-sec_dropdown .panel-title a:hover { color: #20354d; }
.pm-sec_dropdown .panel-heading a:before { font-size: 9px; }
.pm-sec_dropdown .panel-heading a:before { font-family: 'Glyphicons Halflings'; content: "\e252"; }
.pm-sec_dropdown .panel-title > a:focus, .pm-sec_dropdown .panel-title > a:hover { color: #20354d; }
.pm-showMenu{float:left;width:35px;color:#fff;padding:10px 5px;background:#20354d}
.pm-showmenubx{position:absolute;bottom:2px;left:0;background:#20354d;padding:0;color:#ffff;text-align:left;max-height:293px;overflow:auto;width:100%}
.pm-showmenubx .pm-titleQuestion { color:#fff;font-size:12px;margin:4px 0 8px}
.pm-showMenu .fa{font-size:14px;color:#fff;margin-right:0}
.panel-heading .fa-chevron-right, .panel-heading.collapsed .fa-chevron-down{display:none}
.panel-heading .fa-chevron-down, .panel-heading.collapsed .fa-chevron-right{display:inline-block}i.fa{cursor:pointer;margin-right:5px}
.collapsed~.panel-body{padding:0}
.pm-showmenubx .panel-heading{padding:10px 6px;border:0;background:#fff;border-bottom:1px solid #ccc;float:left;width:100%}
.pm-showmenubx .panel-heading p{max-width:90%;float:left;margin:3px 0 0}
.pm-showmenubx .sec_dropdown .panel-body{padding:0}
.pm-showmenubx .panel-heading .fa-chevron-down, .pm-showmenubx .panel-heading.collapsed .fa-chevron-right{float:right;font-size:8px;margin:4px 0 0; }
.pm-showmenubx .panel { margin-bottom:0; }
.pm-iconQuestions{width:20px;height:20px;border-radius:50%;margin:0 4px 0 0;background:#20354d;float:left;padding:5px; }
.pm-mobileClose{display:none}
.pm-bxInputAi{float:left;width:100%;padding:10px;background:#f5f3f3}
.pm-bxInputIcon{float:left;width:42px;margin-top:21px}
.pm-bxInputIcon img{float:left;margin:0 2px;cursor:pointer}
.pm-bxInputText .form-group{margin-bottom:0;float:left;width:87%;margin-left:7px}
.pm-bxInputText .form-control{font-size:14px;border:0 solid #e2e2e2;width:100%;background:#f5f3f3;box-shadow:0 0}
.pm-article_chat, .pm-secCloseMsg{background:#fff;border-style:solid;border-image:initial}
.pm-bxInputIcon a{width:19px;display:block;float:left}
.pm-bxInputText .btn:focus{outline:-webkit-focus-ring-color auto 0;outline-offset:0}
.pm-bxInputText .btn:active{-webkit-box-shadow:inset 0 0 0 transparent;box-shadow:inset 0 0 0 transparent}
.pm-secCloseMsg{width:237px;position:fixed; right: 40px; display: none;
 bottom: 104px; border-width:1px;border-color:#ececec;border-radius:4px;padding:4px 13px 17px}
.pm-btnClose{float:right;width:10px; }
.pm-btnClose .fa { color: #243B55; }
.pm-artiChatui,.article_chat{float:left;position:relative}
.pm-artiChatui{width:100%}
.pm-article_chat{width:100%;margin:0 auto;border-radius:5px;border-width:0;border-color:#ccc}
.pm-chatHeader{width:100%;width:750px;margin:0 auto;background:#243B55;padding:20px 0;position:fixed;z-index:99; }
.pm-chatHeader h2 { margin: 0;color: #fff; font-size: 22px; font-weight:bold; }
.pm-chatHeader p { margin: 5px 0 0; color: #d2b7c1; font-size: 12px;float: left;width: 95%; }
.pm-chatHeader p span { float: left; }
.pm-chatHeader p img { float: left; width: 15px;margin: 0 3px; }
.pm-chatHeader img { max-width: 180px;}
.pm-secMain { position: relative; z-index: 9; float: left; width: 100%; padding: 60px 0px 92px; background: rgba(255, 255, 255, 0.57);}
.pm-leftUserimg { width: 30px; height: 30px;position: absolute; overflow: hidden; left: 3px;
 top: 13px; border-radius: 50%;
 background: #ffffff;
 padding: 2px 5px 0;
 /* border: 1px solid #006cbf; */
 box-shadow: 0 2px 4px 0 #ddedf3;
}
.pm-leftUserimg img {
 width: 100%;
}
.pm-arrowLeftchat { position: absolute; left: -10px; width: 15px; top: 8px;}
.pm-leftInput p{font-size:14px;display:inline-block;margin:0;word-break:break-word; }
.pm-pointLeftchat{position:absolute;bottom:-26px;left:-7px;display:none; }
.pm-pointLeftchat img{width:35px; }
.pm-bxRightchat{float:right;width:100%;margin:0 0 25px; }
.pm-rightInput { float: right;
 position: relative;
 color: #fff;
 padding: 12px 18px;
 border-radius: 18px 18px 0 18px;
 margin: 0px 37px 0px 0px;
 border: 1px solid rgb(187, 187, 187);
 border-image: initial;
 background: rgb(255, 255, 255);
}
.pm-arrowRightchat { position: absolute; right: -15px; width: 15px; top: 8px; }
.pm-rightInput p { color: #000; font-size: 14px; margin: 0px;word-break: break-word; }
.pm-pointRightchat { position: absolute; right: -38px; width: 28px; height: 28px;border-radius: 50%; top: 1px; }
.pm-pointRightchat img { width: 36px; }

.pm-secHideChat img {
 text-align: center;
 -webkit-transition: -webkit-transform 2s; /* Safari */
 transition: transform 1s;
}
.pm-secHideChat img:hover {
 -webkit-transform: rotate(180deg); /* Safari */
 transform: rotate(360deg);
}

.pm-secMainbx { position:relative; max-width: 750px; margin: 0 auto; float: left; width: 100%; border-left: 1px solid #e8e8e8;border-right: 1px solid #e8e8e8; }

.pm-secCloseMsg p { width: 100%; float: left; margin: 0px; font-size: 14px; }
.pm-bxinputtext { width: 80%; float: left; background: rgb(250, 250, 250); padding: 10px; }
#pm-bottom input { width: 100%; font-size: 13px; float: left; margin-right: 10px; border-top-style: initial; border-right-style: initial; border-left-style: initial; border-top-color: initial; border-right-color: initial; border-left-color: initial;
 padding: 8.85px; border-radius: 0px 0px 0px 0px; border-width: 0px 0px 1px; border-image: initial;
 border-bottom: 0px solid rgb(204, 204, 204);background: none; }
.pm-bxInputAi { padding: 10px; background: #f0f0f0; }
.pm-bxInputIcon { float: left; width: 25px; margin-top: 9px;}
.pm-bxInputIcon img { float: left; margin: 0 2px; }
.pm-bxInputText { float: left; width: 100%;background: #ffffff; box-shadow: 6px 18px 40px 16px #d4d4d4; overflow: hidden; }
.pm-bxInputText .form-group { margin-bottom: 0px;float: left;width: 87%; margin-left: 7px; }
.pm-bxInputText .btn { float: left; background: none; width: 31px; padding: 0px 0 0 0;border: 0; margin: 0;height: 48px; text-align: right;position:relative; }
 #pm-bottom button img { width: 18px; display: inline-block; }
.pm-bxInputText .form-control { border: 1px solid #e2e2e2; width: 100%; font-size: 14px; border: 0px solid #e2e2e2; width: 100%; background: #f5f3f3; box-shadow: 0 0 0 0; }
.pm-arrow-right { width: 0px; height: 0px; border-top: 7px solid transparent;
 border-bottom: 7px solid transparent;
 border-left: 10px solid #e3ecf3;}
.pm-arrowRightchat { position: absolute; right: -9px; top: 7px; display: none; }
.pm-arrow-left { width: 0px; height: 0px; border-top: 7px solid transparent; border-bottom: 7px solid transparent; border-right: 10px solid #f6f9fa; }
.pm-arrowLeftchat { position: absolute; left: -10px; top: 7px; display: none; }
.pm-copyright { text-align: right; width: 100%; float: left; padding-right: 14px; margin: 2px 0 0 0; background: #eaeaea; font-size: 12px; }
.pm-copyright a { color: #949494; } 
#pm-bxloadgif { float: left; width: 100%; position: relative;position: relative; }
.pm-bxCheckOPtionUrl { float: right; width: 96%; }
.pm-bxinput input[type="text"] { overflow:hidden !important; }

.pm-headOnline { 
 margin: 5px 0 0 8px;
 width: 6px;
 height: 6px;
 background: #75fe7a;
 border-radius: 50%;
 display: inline-block;
 right: -3px;
 top: 11px;
 position: absolute;
 }
.pm-lineTitle { margin: 0;
 width: 9px;
 height: 2px;
 background: #00febe;
 display: inline-block;
 position: absolute;
 left: 1px;
 bottom: -1px; }
.pm-iconMenu fa:hover { color: #293146; }
.pm-sec_dropdown .panel-group { margin-bottom: 20px; background: #f4f7f9; }
.pm-artMenu {position: relative;
 float: left;
 width: 34px;
 margin: 9px 0 0 7px;
 padding: 5px;
 border: 1px solid #28304487;
 height: 34px;
 border-radius: 50%;}
.pm-secMenucontent { display: none; position: absolute;bottom: 50px;left: 0px; width: 241px; }
.pm-sec_dropdown {position: relative; border: 1px solid #ccc; border-radius: 6px;box-shadow: 0 0 0 1px rgba(0, 0, 0, .1), 0 1px 10px rgba(0, 0, 0, .35); 
overflow: hidden; background: #fff; }
.pm-sec_dropdown h3 { text-align: center; border-bottom: 1px solid #cccc; margin: 0; font-size: 16px; font-weight: bold; padding: 7px; color: #272727; }
.pm-sec_dropdown ul { padding: 0;list-style: none;width: 100%; margin: 0;}
.pm-sec_dropdown ul li { width: 100%;padding: 8px;border-bottom: 1px solid #ccc; color: #293146; font-size: 12px; cursor: pointer; }
.pm-sec_dropdown ul li:last-child { border-bottom: 0px solid #ccc; }
.pm-sec_dropdown ul li:hover{ background: linear-gradient(to right,#0074c9,#10cae2);
 color: #fff;
 opacity: 0.5; }
.pm-bxform { float: left;
 width: 95%;
 border: 0px solid #ccc;
 border-radius: 36px;
 margin-left: 10px;
 padding: 6px 10px 0;
 margin-top: 0px; }
.pm-trianglearrow { position: absolute; bottom: -10px; left: 6px; width: 21px;}
.pm-trianglearrow img { width: 100%; }
.pm-iconMenu .fa { font-size: 17px;
 margin: 0 auto;
 color: #283044; }
.pm-iconMenu .fa:hover { color: #272f42; }
.pm-iconMenu {
 text-align: center;
 padding-top: 1px;
}
.triangle-down {
 position: absolute;
 width: 0;
 bottom: -7px;
 height: 0;
 border-left: 7px solid transparent;
 border-right: 7px solid transparent;
 border-top: 7px solid #ffffff;
 right: 10px;
}
.pm-bxinput textarea { background: none;
 resize: none;
 border: none;
 box-sizing: border-box;
 width: 100%;
 height: auto;
 font-size: 15px;
 font-weight: 400;
 text-indent: 0 !important;
 text-indent: initial !important;
 max-height: 26px;
 padding: 0;
 border-bottom: 0px solid #ccc; }
.pm-bxinput textarea:focus { outline: none;outline: 0; }
.pm-sec_newHeader h2 { font-size: 18px;margin:0px 0 0 0; font-weight:bold; float:left;width: 100%;}
.pm-sec_newHeader p { margin: 0px 0 0 11px;
 color: #616161;
 font-size: 14px;
}
.pm-sec_newHeader { z-index: 100; width: 100%;
 height:0px;
 overflow:hidden; left: 0; top: 0;color: #fff; 
 padding: 12px 10px 0 22px; margin: 0 auto; 
 float: left;
 position: relative;
 top: 0px;
 left: 0px;
 /* box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 4px;*/
 background: #fff; 
 display: none;text-align: center;
 } 

 .pm-titleheader { float: left; width: auto; width: 100%; }
 .pm-titleheader h3 {
 margin: 0 auto;
 position: relative;
 width: 122px;

 }
 .pm-titleheader h3 img {
 margin: auto;max-width: 110px;
 }



.pm-sec_newFooter button:focus, .pm-sec_newFooter button:active, .pm-sec_newFooter button:hover { border: 0;box-shadow: 0 0 0;outline: -webkit-focus-ring-color auto 0px; } 
.pm-shareIcons { float: left; } 
.pm-shareIcons h5 { float: left; margin: 2px 10px 0; font-size: 13px; } 
.pm-shareIcons ul { float: left; padding: 0; margin: 0; text-decoration: none; } 
.pm-shareIcons ul li {float: left;display: inline-block; margin: 0 0px 0 0;} 
.pm-shareIcons ul li a { text-decoration: none; } 
.pm-shareIcons ul li a img { float: left; width: 20px; } 
.pm-copyrightpm { float: right; }
.pm-shareIcons i.fa { font-size: 18px; padding: 1px 3px; }
.pm-shareIcons .fa:hover { color: #ffffff; border-radius: 2px; }
.pm-whatsappLi .fa { color: #00ce18; }
.pm-whatsappLi .fa:hover { background: #00ce18; }
.pm-facebookLi .fa { color: #475993; }
.pm-facebookLi .fa:hover { background: #475993; }
.pm-twitterLi .fa { color: #00aced; }
.pm-twitterLi .fa:hover { background: #00aced; }
.pm-linkedinLi .fa { color: #007bb6; }
.pm-linkedinLi .fa:hover { background: #007bb6; }
#jubisecmain {box-sizing: border-box !important; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #fff; }
::-webkit-scrollbar-thumb { background: #ccc; }
::-webkit-scrollbar-thumb:hover { background: #ccc; }
::-moz-scrollbar { width: 4px;}
::-moz-scrollbar-track { background: #fff; }
::-moz-scrollbar-thumb { background: #ccc; }
::-moz-scrollbar-thumb:hover { background: #ccc; } 
.pm-sec_newFooter input.form-control:focus{ outline: none !important; }
.pm-sec_newFooter input[type="text"] { width: 100%; padding: 15px 10px; border:0px; }
.pm-sec_newFooter input[type="text"]::placeholder { font-size: 14px; }
.pm-sec_newFooter button:focus, .pm-sec_newFooter button:active, .pm-sec_newFooter button:hover { border: 0;box-shadow: 0 0 0;outline: -webkit-focus-ring-color auto 0px; } 
.pm-bxinput { float:left; width:82%; }
.pm-innerloadgifright{padding-right: 20px;float: right; max-width: 70px;}
#pm-timerDiv { background: #fff; float: right; margin: 15px 8px 0 0; }
#pm-timerDiv .fa { color: #666; font-size: 19px;}
#pm-timerDiv .fa:hover { color: #243B55; }
#pm-startBtn { float: right; }
.pm-stopClassBtn { float: left; }
.pm-stopClassBtn p { float: left; margin: 0 5px 0 0; font-size: 12px;width: 44px; color: #666; }
.pm-stopClassBtn #stopBtn { float: left; }
#pm-timerDiv .btn { background: none; border: 0px; margin: 0;padding: 0;width: auto; }
#pm-timerDiv .btn:focus { outline: -webkit-focus-ring-color auto 0px; outline: focus-ring-color auto 0px; }
#jubisecmain{ margin: 0; padding: 0; box-sizing: border-box; } 
.pm-sec_openview { 
 width: 100%;
 position: relative;
 height: 100vh;
 }
.pm-sec_chatbody { background: #fff; height:auto; overflow-y:auto;float: left; width: 100%;margin: 0px;padding: 20px 10px 22px;border-left: 1px solid #e6e6e6; border-right: 1px solid #e6e6e6;background-size: 100%; position: absolute;
 bottom: 60px;
 left: 0;
 top: 0px;
 right: 0;
 /* padding-top: 27px; */
 justify-content: flex-end;
 display: flex;
 flex-flow: column nowrap;
} 
.pm-bxChatbox { width: 100%; float: left; padding: 6px 0px 0px; background: none; 
 justify-content: flex-end;
}
.pm-leftInput { 
 margin-left: 40px;
 display: inline-block;
 background: rgb(237, 245, 248);
 padding: 12px 18px;
 border-radius: 18px 18px 18px 0;
 border: 1px solid #e0eef3;
 }
 .pm-leftInput iframe {
 margin-top: 0px;
 width: 100%;
}
 .pm-sec_newFooter { height:auto; float:left; width: 100%; min-height: 60px;
 padding: 0px;left:0;bottom:0px; border: 1px solid #e9e9e9db; position: absolute; z-index: 99999;
 bottom:0px;left:0px;box-sizing: border-box;
 } 
 .footer-one { display: none; }
 .footer-two { display: block; }

 .jubi-new_copyright {
 float: left;
 text-align: right;
 width: 100%;
 font-size: 11px;
 padding: 0 10px 0 0;
 color: #9c9c9c;position: absolute;
 right: 10px;
 bottom: 0px;
 }
.pm-sec_newFooter input.form-control:focus { outline: none !important; }
.pm-sec_newFooter input[type="text"] { width: 100%; padding: 15px 10px; border:0px; }
.pm-sec_newFooter input[type="text"]::placeholder { font-size: 14px; }
.pm-sec_newFooter button { float: right;
 background: none;
 width: 17px;
 border: 0;
 padding: 5px 0px 0 0;
 text-align: center;
 position: relative;
 border-radius: 0;
 font-weight: bold;
 color: #fff;
 margin: 0;}
#graySend{ width: 100%; } 
.pm-sec_newFooter button:focus, .pm-sec_newFooter button:active, .pm-sec_newFooter button:hover { border: 0;box-shadow: 0 0 0;outline: -webkit-focus-ring-color auto 0px; } 
.pm-sec_newFooter button:hover { border: 0; box-shadow: 0 0 0; outline: -webkit-focus-ring-color auto 0px; }
.pm-bxform { background: none; }
.pm-bxinput { float: left; width: 89%; padding: 0px 0px 0px; background: none; }
.pm-new_copyright { float: left; width: 100%; color: #a1a1a1; text-align: right; font-size: 13px; 
border-top: 0px solid #f5f5f5; padding: 2px 14px 2px 0;}
.pm-new_copyright a { font-size: 12px; color: #242424; }
.pm-innerloadgifright{padding-right: 34px ; float: right; max-width: 70px;}
.pm-innerNotification { position: absolute;top: -8px; right: -7px; width: 20px; height: 20px; background: #fff; border-radius: 50%; text-align: center; font-size: 13px;font-weight: bold; box-shadow: 0 1px 1px 0px #ccc; color: #ee1d25; }
.pm-owlsliderbx {
 float: left;
 width: 100%;
 margin: 0px 0 0 0;
}
.pm-slider-inner {
 width: 100%;
 margin: 0px auto 0;float: left;
} 
.pm-owlsliderbx .owl-theme .owl-dots {
 display: none;
}
 .pm-sec_slider .bx-wrapper { position: relative; margin-bottom: 0px; -moz-box-shadow: 0 0 0px #ccc;
 -webkit-box-shadow: 0 0 0px #ccc; box-shadow: 0 0 0px #ccc; border: 0px solid #fff; background: none; }
 .closeBtn { position: absolute; right: 8px; top: 5px; }
 .closeBtn .fa { color: #888; font-size: 12px; }
 .closeBtn .fa:hover { color: #06abbd; }
 .pm-slider-inner .owl-carousel { float: left; margin-bottom: 10px; }
 .pm-slider-inner .owl-pagination { display: none; }
 .pm-slider-inner .owl-prev { float: left; padding: 3px 10px 3px 8px; }
 .pm-slider-inner .owl-next .fa { line-height: -4px; height: 10px; margin: 1px 2px 0 0; display: block; font-size: 14px; }
 .pm-slider-inner .owl-prev .fa { line-height: -4px; height: 10px; margin: 1px 2px 0 0; display: block; font-size: 14px; }
 .pm-slider-inner .owl-next { right: 10px; background-size: 8px; float: right;opacity: 1; width: 22px; height: 22px; padding: 0px 0px 0px 4px; border-radius: 50%; background-position: center; box-shadow: 0px 1px 1px 0 #3e3e3e; color: #5e5e5e; background: #FFF; font-size: 20px; font-weight: bold; }
 .pm-slider-inner .owl-prev { right: 10px; background-size: 8px; float: left; opacity: 1; width: 22px; height: 22px; padding: 0px 0px 0px 4px; border-radius: 50%; background-position: center; box-shadow: 0px 1px 1px 0 #3e3e3e; color: #5e5e5e; background: #FFF; font-size: 20px; font-weight: bold; }
 .pm-slider-inner .owl-theme .owl-controls .owl-buttons div {
 color: #000; background: #fff; opacity: 1; }
 .pm-slider-inner .owl-theme .owl-controls .owl-buttons div:hover {
 color: #fff; background: #06acbe; }
 .pm-slider-inner .owl-theme .owl-controls .owl-buttons div.owl-prev { padding: 3px 10px 3px 8px; margin-left: -7px; }
 .pm-slider-inner .owl-theme .owl-controls { position: absolute; top: 32%; left: 0; width: 100%; }

 .pm-slider-inner .owl-item {
 margin: 0px;

 }
 .pm-slider-inner .item {
 margin: 0 auto;
 float: none;
 padding-bottom: 5px;
 background: rgb(237, 245, 248);
 border-radius: 5px 5px 5px 0;
 width: 97%;
 padding: 5px;
 }
 .slider-inner .owl-theme .owl-controls .owl-buttons div.owl-next {
 margin-right: -7px;
 }
.owl-carousel .owl-nav button {
 position: absolute;
 top: 35%;
 background: #fff !important;
 border-radius: 50% !important;
}
.owl-carousel .owl-nav button span { 
 margin-top: -2px;
 display: block;
 }
.owl-carousel .owl-nav button span:hover { 
 margin-top: -2px;
 display: block;
 }
.owl-carousel .owl-nav button.owl-prev {
 left: -9px;
 margin: 0;
}
.owl-carousel .owl-nav button.owl-next {
 right: -9px;
 margin: 0;
}
.owl-theme .owl-nav [class*=owl-]:hover {
 background: #7d42f0 !important;
 color: #FFF;
 text-decoration: none;
}
.pm-sec_closeview img {
 width: 100%;
}
.showEditIframe { position: absolute; width: 100%; height: 91%; background: #fff; left: 0; top: 69px;
 padding: 0px; cursor: pointer; z-index: 999999;}
.closeIframeBtn { position: absolute; right: 17px; top: 21px; width: 10px; }
.closeIframeBtn .fa { color: #fff; font-size: 12px; }
.showEditIframe iframe { width: 100%; height: 100%; }
.closeBtn { position: absolute; right: 8px; top: 5px; }
.closeBtn .fa { color: #888; font-size: 12px; }
.closeBtn .fa:hover { color: #06abbd; }
.pm-titleheader h3 span img { width: 30px;
 height: 30px;}
.inputArea {
 float: left;
 width: 100%;
 margin-top: 0px;
 padding-top: 7px;
}
.new_copyright { float:left;width:100%;color: #a1a1a1;text-align:right;font-size: 13px;
 background: #fdf9e4; border-top: 0px solid #efefef; padding: 2px 14px 2px 0;background: #f6f9fa;}
 .new_copyright a { font-size: 12px; color: #242424; } 
.chatProceed-botimg { text-align: center;width: 100%; }
.chatProceed-botimg img { width: 80px;
 margin: 0 auto 22px; }
.pm-sec_newHeader {
 z-index: 999999;
}
.chatProceed, .chatLoading { position: absolute;
 background: #fffffff5;
 z-index: 999999;
 text-align: center;
 top: 0;
 left: 0;
 right: 0;
 bottom: 0;
 padding: 50px 0 0 0; }
.chatProceed {
 padding: 30vh 0 0 0;
}
.pm-sec_show_option_on_start { position: relative; }
.chatLoading { 
 text-align: center;
 padding: 25% 0 0 0;
 }
.chatLoading img {
 margin: 0 auto;
 }
.chatProceed ul {
 margin: 31px 0 0 0;
 padding: 0;
 list-style: none; text-align: center;
}
.chatProceed ul li { max-width: 235px;
 text-align: center;
 margin: 0 auto 13px; }
.chatProceed ul li a { display: block;
 text-decoration: none !important;cursor: pointer;
 min-width: auto;
 color: #242527;
 font-size: 14px;
 text-decoration: none;
 padding: 11px 14px;
 transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s;
 background: #fff;
 border-radius: 12px;
 box-shadow: 1px 1px 1px 1px #c4cac8;
 opacity: 0.9;
 border: 1px solid #fff; }
.chatProceed ul li a:hover { background: linear-gradient(to right,#424242,#252525);
 color: #fff;
 border: 1px solid #191919;}
.chatProceed p {
 font-size: 17px;
 font-weight: 600;
 color: #313131;
}
.leftpanelBg img { width: 100%; }
#pm-chatOpenClose {
 -webkit-transition: all 1s ease-in-out;
 background: url(../images/close-bg.png) no-repeat;
 background-size: 100%;
 text-align: center;
 position: fixed;
 right: 29px;
 bottom: 26px;
 width: 60px;
 height: 60px;
 padding: 17px 0 0 0;opacity: 1;
}
#pm-chatOpenClose img { width: 25px; margin: auto; }
#pm-chatOpenClose img.closeImg { width: 17px; }
.doChatOpenClose {
 transform: rotate(-90deg);
} 
.ulLoading { position: absolute;
 background: #fffffff5;
 z-index: 999999;
 text-align: center;
 top: 50px;
 left: 0;
 right: 0;text-align: center;
 padding: 50px 0 0 0; }
.ulLoading img { width: 11px;
 margin: 43% 0 0 7%; }

.offlinebx {
 width: 100%;
 background: #f04229;
 text-align: center;
 color: #fff;
 min-height: 30px;
 position: absolute;
 top: 43px;
 padding-top: 8px;
 left: 0%;
 z-index: 9;
 box-shadow: 0 2px 4px 0 #ccc;
 border-radius: 0px;
}
.innerofline { float: left; width: 100%; position: relative; }
.oflineClosebtn { position: absolute;
 right: 0px;
 top: 2px;
 color: #17b876; }
.innerofline h3 {
 font-size: 15px;
 margin-top: 7px;
 padding: 0 10px;
 color: #fff;
 margin-bottom: 0px;
}
.pm-secHideMobileChat {
 display: none;
 text-align: center;
 width: 15px;
 position: absolute;
 top: 10px;
 right: 16px;
 cursor: pointer;
 padding: 7px;
 z-index: 999;
 width: 20px;
}
.pm-secHideMobileChat .fa { color: #fff; }
.pm-sec_closeviewMobile {
 display: none;
 background: url(../images/close-bg.png) no-repeat;
 background-size: 100%;
 text-align: center;
 position: fixed;
 right: 29px;
 bottom: 26px;
 width: 60px;
 height: 60px;
 padding: 17px 0 0 0;
 opacity: 1; }

@-webkit-keyframes smallPulse {
 from {
 -webkit-transform: scale(0.75);
 transform: scale(0.75);
 opacity: 1;
 }
 95%, 100% {
 -webkit-transform: scale(2);
 transform: scale(2);
 opacity: 0;
 }
}

@keyframes smallPulse {
 from {
 -webkit-transform: scale(0.75);
 transform: scale(0.75);
 opacity: 1;
 }
 95%, 100% {
 -webkit-transform: scale(2);
 transform: scale(2);
 opacity: 0;
 }
}
@-webkit-keyframes largePulse {
 from {
 -webkit-transform: scale(0.75);
 transform: scale(0.75);
 opacity: 1;
 }
 to {
 -webkit-transform: scale(3.5);
 transform: scale(3.5);
 opacity: 0;
 }
}
@keyframes largePulse {
 from {
 -webkit-transform: scale(0.75);
 transform: scale(0.75);
 opacity: 1;
 }
 to {
 -webkit-transform: scale(3.5);
 transform: scale(3.5);
 opacity: 0;
 }
} 
.jubi-sec_newFooter { background: #fff; height:auto; float:left; width: 100%;height: 78px;
 padding: 0 20px;
 left:0;bottom:0px; border: 1px solid #e9e9e9db; position: absolute; z-index: 99999;
 bottom:0px;left:0px;box-sizing: border-box;
 /* box-shadow: 6px 18px 40px 16px #f7f7f7; */
 text-align: center; display: flex; } 
.jubi-bxinput {
display: flex;
float: left;
width: 100%;
padding: 0px 0px 0px;
background: none;
}
.jubi-bxinput textarea { background: none;
 resize: none;
 border: none;
 box-sizing: border-box;margin: auto;
 width: 100%;
 height: auto;
 font-size: 15px;
 font-weight: 400;
 text-indent: 0 !important;
 text-indent: initial !important;
 max-height: 26px;
 padding: 0;
 border-bottom: 0px solid #ccc; }
.jubi-bxinput textarea:focus { outline: none;outline: 0; }
.jubi-sec_newFooter button {
 float: right;
 background: none;
 width: 22px;
 border: 0;
 padding: 3px 0px 0 0;
 text-align: center;
 position: relative;
 border-radius: 0;
 font-weight: bold;
 color: #fff;
 margin: 0; cursor: pointer;
}
.jubi-sec_newFooter button:hover {
 border: 0;
 box-shadow: 0 0 0;
 outline: -webkit-focus-ring-color auto 0px;
}
.sendIcon { display: none; } 
.voiceIcon { margin: auto; cursor: pointer;
 -webkit-animation: fadein 1s ease-in alternate ;
 -moz-animation: fadein 1s ease-in alternate ;
 animation: fadein 1s ease-in alternate ;
}
.datasendButtons {
 width: 73px;
 position: absolute;
 right: 10px; right: 20px;
 top: 19px;
}
@-webkit-keyframes fadein {
 from { opacity: 0; }
 to { opacity: 1; }
}

@-moz-keyframes fadein {
 from { opacity: 0; }
 to { opacity: 1; }
}
@keyframes fadein {
 from { opacity: 0; }
 to { opacity: 1; }
}
.voiceIcon img {
 width: 35px;
}
.voicePulse { display: none; margin: 0 auto;width: 100%;cursor: pointer;
 float: left; margin-top: 9px; margin: auto;
 -webkit-animation: fadein 1s ease-in alternate ;
 -moz-animation: fadein 1s ease-in alternate ;
 animation: fadein 1s ease-in alternate ;
}
.voicePulse img {
 width: 73px;
}
.navigation {
 background: #0096e0;
 float: left;
 height: 50px;
 width: 100%;
}
.closeBtn {
 width: 16px;
 float: right;
 margin: 9px 25px 0 0;
}
.botIcon {
 width: 40px;
 height: 40px;
 background: #ffffff;
 border-radius: 50%;
 padding: 5px;
 border: 1px solid #eaeaea;
}
.sk-three-bounce {
 margin: 0px auto;
 width: 80px;
 text-align: center; }
 .sk-three-bounce .sk-child {
 width: 20px;
 height: 20px;
 background-color: #136bb0;
 border-radius: 100%;
 display: inline-block;
 -webkit-animation: sk-three-bounce 1.4s ease-in-out 0s infinite both;
 animation: sk-three-bounce 1.4s ease-in-out 0s infinite both; }
 .sk-three-bounce .sk-bounce1 {
 -webkit-animation-delay: -0.32s;
 animation-delay: -0.32s; }
 .sk-three-bounce .sk-bounce2 {
 -webkit-animation-delay: -0.16s;
 animation-delay: -0.16s; }
 
 @-webkit-keyframes sk-three-bounce {
 0%, 80%, 100% {
 -webkit-transform: scale(0);
 transform: scale(0); }
 40% {
 -webkit-transform: scale(1);
 transform: scale(1); } }
 
 @keyframes sk-three-bounce {
 0%, 80%, 100% {
 -webkit-transform: scale(0);
 transform: scale(0); }
 40% {
 -webkit-transform: scale(1);
 transform: scale(1); } }

.voice-buttons { margin: auto; }
.keyboard-icon .fa { font-size: 19px; }

.keyboard-icon .fa:hover {
 color: #136bb0;
}
#stop-recording {
 font-size: 11px;
}
.animationFromLeft {
 position :relative;
 animation: bot-reply 0.5s;
}
@keyframes bot-reply {
 from { bottom: -10px;}
 to { bottom: 0px;}
}
.animationFromRight {
 position :relative;
 animation: user-reply 0.5s;
}
@keyframes user-reply {
 from { bottom: -10px;}
 to { bottom: 0px;}
}

#jubi-recording-text {
 position: absolute;
 bottom: 85px;
 right: 8%;
 max-width: 70%;
 text-align: center;
 border: 1px solid #ccc;
 background: #ffffffb3;
 word-break: break-all;
 box-shadow: 0 2px 4px 0 #ccc;
 padding: 10px 11px;
 border-radius: 5px;
 display: none;
}
#jubi-recording-text p { margin: 0; }

.uploadbox { float: right; width: 28px; padding: 0px 0px 0 0;
 height: 33px; overflow: hidden; }
.uploadbtn { float: right; } 
.uploadbtn { cursor: pointer; }
.inputfile { float: left; padding: 0px 0 0 0; }
.button-section { float: left;}
.button-section button { width: auto; color: #eb3928; margin: 0; padding: 0; font-size: 10px; }
.uploadbox i.fa {
 margin-right: 0px;
 font-size: 20px;
}
.uploadbox img {
 width: 18px;
}
.uploadbox input[type=file] {
 display: none;
}

.img-responsive{
 max-width: 95%
}

/* .chatProceed {
 padding: 40% 0 0;
}
.chatLoading, .chatProceed {
 position: absolute;
 background: 0 0;
 z-index: 999999;
 text-align: center;
 top: 0;
 left: 0;
 right: 0;
 bottom: 0;
 padding: 50px 0 0;
}
.chatProceed-botimg {
 text-align: center;
 width: 100%;
}
.chatProceed-botimg img {
 width: 80px;
 margin: 0 auto 22px;
}
.chatProceed p {
 font-size: 17px;
 font-weight: 600;
 color: #000;
}
.chatProceed ul {
 margin: 31px 0 0;
 padding: 0;
 list-style: none;
 text-align: center;
}
.chatProceed ul li {
 max-width: 235px;
 text-align: center;
 margin: 0 auto 13px;
}
.chatProceed ul li a {
 display: block;
 text-decoration: none!important;
 cursor: pointer;
 min-width: auto;
 color: #000;
 font-size: 14px;
 padding: 11px 14px;
 background: #fff;
 border-radius: 12px;
 box-shadow: 1px 1px 1px 1px #c4cac8;
 opacity: .9;
 border: 1px solid #fff;
 -webkit-transition: all .5s ease-out;
 -moz-transition: all .5s ease-out;
 -o-transition: all .5s ease-out;
 transition: all .5s ease-out;
}

.chatLoading {
 text-align: center;
 padding: 60% 0 0;
}
.chatLoading img {
 margin: 0 auto;
} */


@media (max-width: 1315px){
 .leftpanelBg img {width: 110%; max-width: 110%;}
}
@media (max-width: 1199px){
 .leftpanelBg img {width: 137%; max-width: 137%;}
}

@media (max-width: 991px){
  .pm-mobileClose { display: block; }
  .pm-desctopClose { display: none; }
 .pm-chatHeader { width: 100%; }
 .leftpanelBg img {width: 170%; max-width: 170%;}
}
@media (max-width: 767px){
 .pm-secCloseMsg { bottom: 106px; }
   body .container { width: 100%; padding: 0 5px }
  .pm-secMain { padding: 0 38px 50px;}  
  .pm-leftInput p { font-size: 14px; color: #263238;}
  .pm-secMain { padding: 0 0px 60px;}
  .pm-pointLeftchat { right: -40px; width: 28px; top: 0; height: 28px; border-radius: 50%; border: 1px solid #ccc; background: #fff;} 
  .pm-postImg { max-width: 226px;}
  /* .pm-bxloadgif img {border:0px solid #ccc;width:100%; margin-bottom: 15px; } */
  .pm-leftInput { margin-left: 43px; }
  .pm-leftInput_new {margin: 0;}
  .pm-rightUserimg { width: 30px; height: 30px;}
  .input-lg { font-size: 16px; border-radius: 15px 15px 9px 15px;}  
  .pm-bxCheckOPtion ul{margin: 15px 0;}
  .pm-bxCheckOPtion ul li { margin-right: 10px; font-size: 12px;}
  .pm-bxCheckOPtion ul li p {padding: 10px;margin-right: 0px;min-width: 97px;padding: 4px 10px; font-size: 14px;}
  .pm-bxCheckOPtion ul li a {padding: 10px;margin-right: 0px;min-width: 97px;padding: 4px 10px;font-size: 14px;}
  .pm-bxCheckOPtionPersist ul {margin: 15px 0;}
  .pm-bxCheckOPtionPersist ul li {margin: 1px 1px; font-size: 12px;}
  .pm-bxCheckOPtionPersist ul li p {padding: 10px;margin-right: 0px;min-width: 97px;padding: 4px 10px; font-size: 14px;}
  .pm-bxCheckOPtionPersist ul li a { margin-right: 2px; min-width: 97px; padding: 8px 18px; font-size: 14px; margin-bottom: 1px; }
  .pm-bxLeftchat { margin: 3px 0 5px; }
  .pm-bxRightchat { margin: 7px 0 7px;}
  .pm-bxCheckOPtionUrl ul{margin-bottom: 15px;}
  .pm-bxCheckOPtionUrl ul li { margin-right: 4px; font-size: 12px;}
  .pm-bxCheckOPtionUrl ul li p {padding: 10px;margin-right: 0px;min-width: 97px;padding: 4px 10px; font-size: 14px;}
  .pm-bxCheckOPtionUrl ul li a {padding: 10px;margin-right: 0px;min-width: 97px;padding: 4px 10px;font-size: 14px;}
  .pm-bxCheckOPtionUrl ul {margin-top: 14px;}
  .pm-bxCheckOPtionUrl { margin-top: 0px;}
  .pm-rightInput { margin-right: 38px; }
  .pm-rightInput p { font-size: 14px;}
  .pm-logo { margin-left: 10px;}
   header {padding: 3px 0 5px; height: auto;min-height: auto;}
  .pm-logo img { width: 100px;}
  .pm-secMain { margin-top: 0px; }
  .pm-bxCheckOPtion { margin-top: 0px;}
  .pm-bxgetthefull { margin-top: 7px; }
  .pm-bxsocial { margin-top: 11px; }
  .pm-bxloadgif {margin: 0px 0 10px;}
  /* .pm-innerloadgif {margin-left: 44px; max-width: 36px; margin-bottom: 4px; } */
  .pm-bxgetthefull { margin-top: 9px; }
  .pm-sec_slider { min-height: auto; }
  .pm-slideImage {min-height: 200px;}
  #pm-bottom { width: 100%; }
  .pm-chatHeader { padding: 12px 10px; position:fixed;}
  .pm-chatHeader h2 { font-size: 18px; }
  .pm-bxInputAi { padding: 0px 0 5px;}
  .pm-copyright a { font-size: 12px; }
  .pm-bxInputText { width: 100%; }
  #pm-bottom input { margin-right: 0; padding: 0px 8.85px; height: auto; min-height: 49px;position: relative; z-index: 9999; }
  .pm-copyright { margin: 0; }
  #pm-bxloadgif {padding-bottom: 25px;}
 .pm-sec_newFooter button { margin: 15px 8px 0 0; }
 .pm-bxinput { width: 88%; } 
 /* .pm-sec_newHeader p { margin: 3px 0 0; font-size: 12px; } */
 .pm-sec_newHeader { padding:9px 0 0px;}
.pm-sec_newFooter button { margin: 0 0 0; z-index: 999; }
.pm-bxinput { width: 69%; } 
.pm-sec_openview {top: auto; bottom: 0; left: auto;position: fixed; z-index: 99; width: 100%; left: 0%; top: auto; }

.pm-sec_newHeader { display: block; } 
.pm-sec_newHeader { position: relative;
 z-index: 9999999;
 height: 80px;}
 .pm-sec_chatbody { 
 top: 0px; }


}
@media (max-width:560px){ 
  .pm-leftUserimg { width: 28px;float: left; height: 28px; }
  .pm-rightUserimg { width: 30px; height: 30px;top:0;bottom:auto; }
  .pm-leftInput { margin-left: 43px; }
 .pm-leftInput_new { margin: 0; }
  .container { padding-right: 8px; padding-left: 5px;}  
 .pm-bxinputtext { width: 72%; }
 .pm-secCloseMsg { bottom: 85px; }
}
@media (max-width: 480px) {
 .pm-sec_openview { height: 100%; }
 .pm-secCloseMsg { bottom: 79px; }
} 
/* @media (max-width: 380px){
 .pm-bxform { width: 80%; }
} */
/* ----------------------- */

.pm-secCloseview { display: none; }

#jubisecmain { font-family: muli,sans-serif; }
.sec_main { float: left; width: 100%; position: relative; }
.leftPage { float: left;width: 50%;height: 100vh;background: #424242;position: relative; overflow: hidden; } 
.leftpage_opacity { position: absolute;left: 0; right: 0; top: 0; bottom: 0;z-index: 9; background: #000000ad; }
.leftContent {position: absolute;top: 0%;padding: 21px;color: #fff;z-index: 9; height: 100%; display: flex; flex-flow: column nowrap; }
.leftContent h2 { font-weight: 700;font-size: 52px; padding: 0 40px;font-family: muli; margin: auto;margin-top: 35%; }
.rightPage { float: right; width: 50%; height: 100vh; background: #fff; } 
/* chat bot */
.logo { width: 100%;float: left; }
.logo img { width: 200px; }
.sec_openview { width: 100%; float: left;
 padding: 0;
 margin: 0 auto;overflow: hidden;
 border: 0px solid rgb(194, 194, 194);
 position: relative;
 height: 100vh;}
.innerloadgif { width: 60px; }
#bxinputPlace {position: relative;
 width: 100%;
 height: auto;
 float: left;
 padding: 0px 28px;
 border-radius: 24px;
 margin: 0 0 19px;
}
.innerloadgif img { width: 100%; }
.sec_chatbody { padding: 20px 20px 0px;
 background: none;
 margin: 0 auto;
 float: left;
 width: 100%;
 height: 86.8%;
 overflow-y: auto;
 overflow-x: hidden;
 position: relative; 
 justify-content: flex-end;
 display: flex;
 flex-flow: column nowrap;
}
.sec_slider { display: none; }
.postImg {
 max-width: 258px;
 border-radius: 5px;
 overflow: hidden;
}
.bxChatbox { width: 100%; justify-content: flex-end; float: left; }
.bxLeftchat { margin-bottom: 10px; float: left; width: 94%; position: relative; margin-top: 0px; }

.bxLeftchatwithImg.bxLeftchat { margin-bottom: 25px; }

/* .logo { width: 144px; } */

.bxLeftchat { -webkit-transition: height 0s 5000ms, opacity 3000ms ease-in-out;
 -moz-transition: height 0s 5000ms, opacity 3000ms ease-in-out;
 -ms-transition: height 0s 5000ms, opacity 3000ms ease-in-out;
 -o-transition: height 0s 5000ms, opacity 3000ms ease-in-out;
 transition: height 0s 5000ms, opacity 3000ms ease-in-out; }
.leftUserimg { width: 43px;height: 43px;position: absolute;left: 10px;bottom: 0px;overflow: hidden;
 padding: 1px; border-radius: 50%;box-shadow: 0 2px 4px 0 #ccc; }
.leftUserimg img { width: 100%; }
.leftInput {display: inline-block; padding: 14px 17px;
 margin-left: 66px; position: relative; margin-bottom: 0px;
 border-radius: 26px 26px 26px 0;
 background: #f6f9fa;
 font-weight: 300; }

/* .bxLeftchatwithImg .leftInput { margin-left: 66px; } */


.leftInput p { font-size: 16px; display: inline-block; margin: 0px; font-weight: 400; color: #505050; }
.checkOnOffline { bottom: 15px; }
.checkOnOffline { display: block; width: 48px; margin: 0; position: absolute; left: 64px; text-transform: uppercase;display: none; }
.checkOnOffline h5 { margin: 0; float: left; font-size: 12px; color: #dadada; text-align: right;
 width: 100%; font-style: italic; }
.bxRightchat { float: right; width: 94%; margin: 0px 3px 25px 0; position: relative; }
.rightInput { float: right;
 position: relative;
 color: rgb(0, 0, 0);
 padding: 12px 18px 12px 18px;
 border-radius: 26px 26px 0px 26px;
 margin: 0px 0px 0px 0px;
 border-width: 0;
 border-style: solid;
 border-color: rgb(219, 219, 219);
 border-image: initial;
 background: #27293e;
 min-width: 121px;
 text-align: center; }
.right_checkOnOffline h5 { color: #fff; }
.right_checkOnOffline { width: auto; right: 13px;display: none; }
.rightInput p { font-family: Roboto, sans-serif; word-break: break-word; font-size: 16px; display: inline-block; margin: 0px; font-weight: 300; color: #fff; }
.rightUserimg { display: none; }
/* loader */
.loader{ padding: 11px 3px; width: auto; height: auto; position: relative; margin: 0 0 0 25px;
 float: left; border: 1px saddlebrown; text-align: center; box-shadow: 0px 5px 12px 0px #fff;
 border-radius: 5px; }
/* #loader-2 span{ */
#loader-4 span{ display: inline-block; width: 8px; height: 8px; border-radius: 100%; background-color: #8bcbca;
 margin: 0 5px; } 
 #loader-2 span:nth-child(1){ animation: bounce 1s ease-in-out infinite; } 
 #loader-2 span:nth-child(2){ animation: bounce 1s ease-in-out 0.13s infinite; } 
 #loader-2 span:nth-child(3){ animation: bounce 1s ease-in-out 0.26s infinite; } 
 @keyframes bounce{
 0%, 75%, 100%{
 -webkit-transform: translateY(-10px);
 -ms-transform: translateY(-7px);
 -o-transform: translateY(-7px);
 transform: translateY(-7px);
 } 
 25%{
 -webkit-transform: translateY(-10px);
 -ms-transform: translateY(-7px);
 -o-transform: translateY(-7px);
 transform: translateY(-7px);
 }
 }
.loader { margin-left: 74px; }
/* Animation module */ 
 .module { position: relative; }
 .module:nth-child(even) { margin-right: 0; } 
 .come-in { transform: translateY(150px); animation: come-in 0.8s ease forwards; } 
 .come-in:nth-child(odd) { animation-duration: 0.6s; } 
 .already-visible { transform: translateY(0); animation: none; } 
 @keyframes come-in {
 to {
 transform: translateY(0);
 }
 }
 #loader-4 span:nth-child(1){
 animation: opacitychange 1s ease-in-out infinite;
 } 
 #loader-4 span:nth-child(2){
 animation: opacitychange 1s ease-in-out 0.33s infinite;
 } 
 #loader-4 span:nth-child(3){
 animation: opacitychange 1s ease-in-out 0.66s infinite;
 } 
 @keyframes opacitychange{
 0%, 100%{
 opacity: 0;
 }
 
 60%{
 opacity: 1;
 }
 }
/* .scroll-class::-webkit-scrollbar, .scroll-class::scrollbar {
 display: none;
 } */
 .bxChat::-webkit-scrollbar { width: 0px;}
 .bxChat::-webkit-scrollbar-track { background: #f1f1f1; }
 .bxChat::-webkit-scrollbar-thumb { background: #27293e; }
 .bxChat::-webkit-scrollbar-thumb:hover { background: #555; }
 .bxChat::-moz-scrollbar { width: 5px;}
 .bxChat::-moz-scrollbar-track { background: #27293e; }
 .bxChat::-moz-scrollbar-thumb { background: #555; }
 .bxChat::-moz-scrollbar-thumb:hover { background: #555; }
/* input box */
.bxinputPlace { float: right; }
.bxform { float: right; width: 92%;background: none; }
.bxinput { float: right;
 width: 100%;
 padding: 0px 20px;
 background: #fff;
 border: 1px solid #d6d6d6;
 margin: .5rem auto 1.5rem;
 border-radius: 1rem;
 box-shadow: 0 0 4px 2px rgba(228,236,244,.4);
}
.bxtextarea { width: 86%; float: left; line-height: 11px;height: auto; }
.bxinput textarea { border: none; box-sizing: border-box; width: 100%; font-size: 16px; font-weight: 400; padding:14px 0 0 10px; background: none; margin: 0; height: auto; line-height: 16px; }
.bxinput textarea::placeholder { color: #aeb5ba; }
.bxinput textarea:focus { outline: -webkit-focus-ring-color auto 0px; }
.bxinput button { float: right; background: none; width: 35px; padding: 0px 0 0 0; border: 0; margin: 9px 0px 0 0; text-align: right; position: relative; border: 0px; }
#bottomClick img { width: 18px; }
/* options */
.bxCheckOPtion, .bxCheckOPtionPersist { text-align: center;
 margin: 0px auto 17px;
 width: 100%;
 float: left; }
.bxCheckOPtion ul, .bxCheckOPtionPersist ul { padding: 0; margin: 0px auto; }
.bxCheckOPtion ul li, .bxCheckOPtionPersist ul li { display: inline-block; margin-right: 5px; margin-bottom: 9px; }
/* .bxCheckOPtion ul li:last-child { margin-right: 0px;} */
.bxCheckOPtion ul li a, .bxCheckOPtionPersist ul li a { display: inline-block; text-decoration: none !important;
 min-width: auto; color: #0f2e5d; font-size: 16px; text-decoration: none;padding: 8px;
 transition: transform 0.5s cubic-bezier(0.68, 0.01, 0.245, 1.13) 0s; 
 border-radius: 8px; opacity: 0.9; border: 1px solid #27293e;
 font-weight: 600; min-width: 95px; text-align: center; 
 color: #27293e;
 background-color: transparent;
 background-image: none; 
 }
.bxCheckOPtionPersist ul li a:hover, .bxCheckOPtion ul li a:hover { background: #27293e; color: #fff !important; }
 
.bxLeftchatPostImg .leftInput {
 padding: 0px;
 border-radius: 0;
 background: none; }


.jubi-muteUnmuteVoice { float: left; width: 36px;display: flex; }
#jubi-muteVoice { display: none; }
#jubi-unmuteVoice, #jubi-muteVoice { cursor: pointer; width: 100%; text-align: center;margin: auto; }
#jubi-unmuteVoice img, #jubi-muteVoice img { width: 100%; padding: 5px; margin: 0 auto; }



@media (max-width: 767px){
 .leftPage { width: 100%; height: auto;}
 .rightPage { width: 100%; }
 .leftContent h2 {font-size: 27px;padding: 0 0px;}
 .bxinput {padding: 0px 7px;}
 .bxCheckOPtion ul li a, .bxCheckOPtionPersist ul li a { font-size: 13px; }
 .leftPage { display: none; }
}


		`
}