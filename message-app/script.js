import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getDatabase, ref, set, child, update, remove, get, onValue, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-database.js";

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
var online;

function randomColor(){
    var color = Math.floor(Math.random()*16777215).toString(16);
    do {color = "0" + color} while (color.length != 6);
    return color;
}

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
                    sendMessage(message, messages[message]);
                })
            }
        })
        get(child(dbRef, `users/${username}`)).then((snapshot) => {
            if (!snapshot.exists()) {
                set(ref(database, `users/${username}`), {
                    createTime: Date.now(),
                    color: randomColor(),
                    profilePhoto: "./imgs/default-avatar.png"
                });
            }
        }).catch((error) => {
            console.log(error);
        })
        loginContainer.style.display = "none";
        messageContainer.style.display = "grid";
        appTitle.innerHTML = username;
        online = true;
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
const userColorInput = document.querySelector("input#user-color-picker");
const profilePhotoInput = document.querySelector("input#user-photo-picker");

function getTimeFromMS(milliseconds){
    const date = new Date(milliseconds);
    const hours = (date.getHours() < 10 ? "0" : "") + date.getHours();
    const minutes = (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
    return hours + ":" + minutes;
}

function getDateFromMS(milliseconds){
    const date = new Date(milliseconds);
    const day = date.getDate();
    const month = new Intl.DateTimeFormat('tr-TR', {month: "long"}).format(date);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
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
            const previousMessageId = `message${maxValue}`;
            
            if (messageInfo["sender"] !== snapshot.val()[previousMessageId]["sender"]) {
                messageInfo["newMessageFromUser"] = true;
            }

            const currentDate = getDateFromMS(messageInfo["createTime"]);
            const previousDate = getDateFromMS(snapshot.val()[previousMessageId]["createTime"]);
            if (currentDate !== previousDate) {
                messageInfo["newDate"] = true;
                messageInfo["newMessageFromUser"] = true;
            }

        } else {
            messageId = "message1";
            messageInfo["newDate"] = true;
            messageInfo["newMessageFromUser"] = true;
        }
        set(ref(database, `messages/${messageId}`), messageInfo);
    })
}

onValue(ref(database, `messages/`), (snapshot) => {
    if (snapshot.exists()){
        const messagesObject = snapshot.val();
        var messageIDs = Object.keys(messagesObject);
        messageIDs = messageIDs.map(e => e.replace("message", ""));
        const maxValue = Math.max(...messageIDs);
        get(child(dbRef, `messages/message${maxValue}`)).then((message) => {
            if (message.exists() && online){
                sendMessage(`message${maxValue}`, message.val());
            }
        })
    }
});

function sendMessage(messageId, messageData){
    if (!messageId || !messageData) {return;}
    const image = messageData["imageURL"];
    const text = messageData["content"];
    const messageElement = document.createElement("span");
    messageElement.classList.add("message-element");

    if (messageData["newMessageFromUser"]) {
        messageElement.classList.add("message-new");

        const messageName = document.createElement("span");
        messageName.classList.add("message-username");
        messageName.innerHTML = messageData["sender"];

        const userPhoto = document.createElement("img");
        userPhoto.classList.add("message-photo");

        get(child(dbRef, `users/${messageData["sender"]}`)).then((snapshot) => {
            if (snapshot.exists()) {
                messageName.style.color = snapshot.val()["color"];
                userPhoto.src = snapshot.val()["profilePhoto"];
            }
        })

        messageElement.appendChild(userPhoto);
        messageElement.appendChild(messageName);
    }

    if (messageData["sender"] === username) {messageElement.classList.add("message-sent");}
    else {messageElement.classList.add("message-received");}

    messageElement.setAttribute("data-time", getTimeFromMS(messageData["createTime"]));

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

    if (messageData["newDate"]) {
        const dateElement = document.createElement("span");
        dateElement.classList.add("date-element");
        dateElement.innerHTML = getDateFromMS(messageData["createTime"]);
        messageSection.insertBefore(dateElement, messageElement);
    }
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
    document.querySelector(".option-color .user-color-picker").classList.remove("active");
});

userColorInput.addEventListener("change", function(e){
    get(child(dbRef, `users/${username}`)).then((snapshot) => {
        if (snapshot.exists()) {
            set(ref(database, `users/${username}/color`), e.target.value);
            alert("Renk başarıyla değiştirildi!");
            appOptions.classList.remove("active");
        }
    }).catch((error) => {
        alert("Bir hata oluştu!");
        console.log(error);
    }
)
});

document.querySelector(".option-color").addEventListener("click", function(e){
    document.querySelector(".option-color .user-color-picker").classList.toggle("active");
});

[...document.querySelectorAll(".user-color-picker span")].forEach(element => {
    const color = element.getAttribute("data-color")
    element.style["background-color"] = color;
    element.addEventListener("click", function(e){
        get(child(dbRef, `users/${username}`)).then((snapshot) => {
            if (snapshot.exists()) {
                set(ref(database, `users/${username}/color`), color);
                alert("Renk başarıyla değiştirildi!");
                appOptions.classList.remove("active");
            }
        }).catch((error) => {
            alert("Bir hata oluştu!");
            console.log(error);
        }
    )
    })
})

profilePhotoInput.addEventListener("change", function(e){
    get(child(dbRef, `users/${username}`)).then((snapshot) => {
        if (snapshot.exists()) {
            console.log(e.target.files);
            const profilePhoto = e.target.files[0];
            const reader = new FileReader();

            reader.addEventListener("load", ()=>{
                set(ref(database, `users/${username}/profilePhoto`), reader.result);
            })

            reader.readAsDataURL(profilePhoto);
            alert("Profil fotoğrafı başarıyla eklendi!");
            appOptions.classList.remove("active");
        }
    }).catch((error) => {
            alert("Bir hata oluştu!");
            console.log(error);
        }
    )
})

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
