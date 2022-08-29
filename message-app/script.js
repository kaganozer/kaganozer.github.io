import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getDatabase, ref, set, child, update, remove, get, onValue } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAqgqB2-BFmAhOS1Lq382gIWr-TGRJyICk",
    authDomain: "message-application-5bb5c.firebaseapp.com",
    projectId: "message-application-5bb5c",
    storageBucket: "message-application-5bb5c.appspot.com",
    messagingSenderId: "887925978609",
    appId: "1:887925978609:web:a19e9d56a372ec1ac64050",
    databaseURL: "https://message-application-5bb5c-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database);

const loginContainer = document.querySelector("div.message-app-login");
const loginInput = document.querySelector("input#login-name-input");
const loginSubmit = document.querySelector("div.login-submit");

const messageContainer = document.querySelector("div.message-app-container");
const appTitle = document.querySelector(".title");

var username;

function login(){
    username = loginInput.value;
    if (username) {
        get(child(dbRef, "messages")).then((snapshot) => {
            if (snapshot.exists()){
                const messages = snapshot.val();
                const messagesArr = Object.keys(messages);
                messagesArr.sort(function (a, b) {
                    return (+a.replace("message", "")) - (+b.replace("message", ""));
                });
                messagesArr.forEach(message => {
                    sendMessage(messages[message]);
                })
            }
        })
        get(child(dbRef, `users/${username}`)).then((snapshot) => {
            if (!snapshot.exists()) {
                set(ref(database, `users/${username}`), {
                    createTime: Date.now()
                });
            }
        }).catch((error) => {
            console.log(error);
        })
        loginContainer.style.display = "none";
        messageContainer.style.display = "grid";
        appTitle.innerHTML = username;
    }
}

loginSubmit.addEventListener("click", function(e){login();})
loginInput.addEventListener("keydown", function(e){
    if (e.keyCode === 13) {login()};
})

const messageSection = document.querySelector("div.message-section");
const messageInput = document.querySelector("input#message-input");
const messageSend = document.querySelector("span.send-message");
const photoPreview = document.querySelector("span.photo-preview");
const showFileOptions = document.querySelector("button.show-file-options");
const appOptions = document.querySelector("button.dots");
const photoInput = document.querySelector("input#photoUpload");
const fileInput = document.querySelector("input#fileUpload");
const scrollToBottom = document.querySelector("div.scroll");

function getTimeFromMillis(timestamp){
    const date = new Date(timestamp);
    const hours = (date.getHours() < 10 ? "0" : "") + date.getHours();
    const minutes = (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
    return hours + ":" + minutes;
}

function sendMessageToDB(){
    const image = document.querySelector("span.photo-preview img");
    const text = messageInput.value;
    if (!image && !text) {return;}
    
    const createTime = new Date();

    const messageInfo = {
        "sender": username,
        "createTime": createTime.getTime()
    };

    if (image) {messageInfo["imageURL"] = image.src};
    if (text) {messageInfo["content"] = text};

    get(child(dbRef, "messages")).then((snapshot) => {
        var messageId;
        if (snapshot.exists()) {
            const messagesObject = snapshot.val();
            var messageIDs = Object.keys(messagesObject);
            messageIDs = messageIDs.map(e => e.replace("message", ""));
            const maxValue = Math.max(...messageIDs);
            messageId = "message" + (maxValue+1);
        } else {
            messageId = "message1";
        }
        set(ref(database, `messages/${messageId}`), messageInfo);
    })
}

onValue(ref(database, `messages/`), (snapshot) => {
    const messagesObject = snapshot.val();
    var messageIDs = Object.keys(messagesObject);
    messageIDs = messageIDs.map(e => e.replace("message", ""));
    const maxValue = Math.max(...messageIDs);
    get(child(dbRef, `messages/message${maxValue}`)).then((message) => {
        sendMessage(message.val());
    })
});

function sendMessage(messageData){
    const image = messageData["imageURL"];
    const text = messageData["content"];
    const messageElement = document.createElement("span");
    messageElement.classList.add("message-element");
    const messageName = document.createElement("span");
    messageName.classList.add("message-username");
    messageName.innerHTML = messageData["sender"];
    messageElement.appendChild(messageName);

    if (messageData["sender"] === username) {messageElement.classList.add("message-sent");}
    else {messageElement.classList.add("message-received");}

    messageElement.setAttribute("data-time", getTimeFromMillis(messageData["createTime"]));
    if (image) {
        const imageContent = document.createElement("img");
        imageContent.classList.add("image-content");
        imageContent.setAttribute("src", image.src);
        messageElement.appendChild(imageContent);
        image.src=""; photoPreview.style.display = "none";
    } if (text) {
        const messageContent = document.createElement("span");
        messageContent.classList.add("message-content");
        messageContent.innerHTML = text;
        messageElement.appendChild(messageContent);
        messageInput.value = "";
    }
    messageSection.appendChild(messageElement);
    messageSection.scrollTop = messageContainer.scrollHeight;
}

messageSend.addEventListener("click", function(e){
    sendMessageToDB();
});

messageInput.addEventListener("keydown", function(e){
    if (e.keyCode === 13) {sendMessageToDB();}
});

showFileOptions.addEventListener("click", function(e){
    showFileOptions.classList.toggle("active");
});

[fileInput, photoInput].forEach(element => {
    element.addEventListener("input", function(e){
        showFileOptions.classList.remove("active");
    })
})

appOptions.addEventListener("click", function(e){
    appOptions.classList.toggle("active");
});

messageSection.addEventListener("scroll", function(e){
    if (messageSection.scrollHeight - messageSection.scrollTop !== messageSection.clientHeight) {
        scrollToBottom.style.transform = "scale(1)";
        scrollToBottom.style.opacity = "1";
    } else {
        scrollToBottom.style.transform = "scale(0)";
        scrollToBottom.style.opacity = "0";
    }
})

scrollToBottom.addEventListener("click", function(e){
    messageSection.scrollTop = messageSection.scrollHeight;
})
