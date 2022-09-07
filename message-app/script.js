import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getDatabase, ref, set, child, remove, get, onValue, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-database.js";

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
const messageSection = document.querySelector("div.message-section");
const appTitle = document.querySelector(".title");

let username;
let online;
const status = {
    "online": {
        "tr-TR": "Çevrimiçi",
        "color": "#71eb8d"
    },
    "offline": {
        "tr-TR": "Çevrimdışı",
        "color": "#616066"
    }
};

function scroll(el) {el.scrollTop = el.scrollHeight;}

function login(){
    username = loginInput.value;
    if (username) {
        get(child(dbRef, `users/${username}`)).then((snapshot) => {
            if (!snapshot.exists()) {
                const userData = {
                    "createTime": Date.now(),
                    "profilePhoto": "./imgs/default-avatar.png",
                    "status": "online"
                }
                set(ref(database, `users/${username}`), userData);
            }
        }).catch((error) => {
            console.log(error);
        })

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

        get(child(dbRef, "users")).then((snapshot) => {
            if (snapshot.exists()){
                Object.keys(snapshot.val()).forEach(user => {
                    onChildChanged(ref(database, `users/${user}/`), (child) => {
                        if (child.key === "status") {
                            [...document.querySelectorAll(`.message-element[data-user='${user}'] .user-status`)].forEach(el => {
                                el.style["background-color"] = status[child.val()]["color"];
                            });
                        }
                        if (child.key === "color") {
                            [...document.querySelectorAll(`.message-element[data-user='${user}'] .message-username`)].forEach(el => {
                                el.style["color"] = child.val();
                            });
                        }
                        if (child.key === "profilePhoto") {
                            [...document.querySelectorAll(`.message-element[data-user='${user}'] .messag-photo`)].forEach(el => {
                                el.src = child.val();
                            });
                        }
                    });
                })
            }
        })
        
        set(ref(database, `users/${username}/status`), "online");

        loginContainer.style.display = "none";
        messageContainer.style.display = "grid";
        scroll(messageSection);
        appTitle.innerHTML = username;
        online = true;
    }
}

loginSubmit.addEventListener("click", function(e){login();})
loginInput.addEventListener("keydown", function(e){if (e.keyCode === 13) {login()};})

const messageInput = document.querySelector("input#message-input");
const messageSend = document.querySelector("span.send-message");
const messageContextMenu = document.querySelector("div.message-context-menu");
const messageReactions = document.querySelectorAll("span.reaction");
const messageDelete = document.querySelector("span.message-delete");
const photoPreview = document.querySelector("span.photo-preview");
const showAppOptions = document.querySelector("button.dots");
const appOptions = document.querySelector("span.options");
const photoInput = document.querySelector("input#photoUpload");
const photoDelete = document.querySelector("span.delete-photo");
const scrollToBottom = document.querySelector("div.scroll");
const userColorInput = document.querySelector("input#user-color-picker");
const profilePhotoInput = document.querySelector("input#user-photo-picker");

function normalizePosition(mouseX, mouseY) {
    const {
        left: sectionOffsetX,
        top: sectionOffsetY
    } = messageSection.getBoundingClientRect();

    const sectionX = mouseX - sectionOffsetX;
    const sectionY = mouseY - sectionOffsetY;

    const outOfBoundsOnX = sectionX + messageContextMenu.clientWidth > messageSection.clientWidth;
    const outOfBoundsOnY = sectionY + messageContextMenu.clientHeight > messageSection.clientHeight;

    let normalizedX = mouseX;
    let normalizedY = mouseY;

    if (outOfBoundsOnX) {
        normalizedX = sectionOffsetX + messageSection.clientWidth - messageContextMenu.clientWidth;
    }
    if (outOfBoundsOnY) {
        normalizedY = sectionOffsetY + messageSection.clientHeight - messageContextMenu.clientHeight;
    }

    return {normalizedX, normalizedY};
};

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
            const maxValue = Math.max(...Object.keys(snapshot.val()).map(e => e.replace("message", "")));
            messageId = `message${maxValue+1}`;
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

onChildAdded(ref(database, `messages/`), (snapshot) => {
    if (online) {sendMessage(snapshot.key, snapshot.val());}
});

function sendMessage(messageId, messageData){
    if (!messageId || !messageData) {return;}
    const image = messageData["imageURL"];
    const text = messageData["content"];
    const messageElement = document.createElement("span");
    messageElement.classList.add("message-element");
    messageElement.id = messageId;
    messageElement.setAttribute("data-user", messageData["sender"]);

    if (messageData["newMessageFromUser"]) {
        messageElement.classList.add("message-new");

        const messageName = document.createElement("span");
        messageName.classList.add("message-username");
        messageName.innerHTML = messageData["sender"];

        const userPhoto = document.createElement("img");
        userPhoto.classList.add("message-photo");

        const userStatus = document.createElement("span");
        userStatus.classList.add("user-status");

        get(child(dbRef, `users/${messageData["sender"]}`)).then((snapshot) => {
            if (snapshot.exists()) {
                messageName.style.color = snapshot.val()["color"];
                userPhoto.src = snapshot.val()["profilePhoto"];
                userStatus.style["background-color"] = status[snapshot.val()["status"]]["color"];
            }
        })

        messageElement.appendChild(userPhoto);
        messageElement.appendChild(userStatus);
        messageElement.appendChild(messageName);
    }

    if (messageData["sender"] === username) {messageElement.classList.add("message-sent");}
    else {messageElement.classList.add("message-received");}

    messageElement.setAttribute("data-time", getTimeFromMS(messageData["createTime"]));

    if (image) {
        const imageContent = document.createElement("img");
        imageContent.classList.add("image-content");
        imageContent.setAttribute("src", image);
        messageElement.appendChild(imageContent);
        messageElement.classList.add("image");
        photoPreview.style.display = "none";
    } if (text) {
        const messageContent = document.createElement("span");
        messageContent.classList.add("message-content");
        messageContent.innerHTML = text;
        messageElement.appendChild(messageContent);
        messageInput.value = "";
    }

    if (messageData["deleted"]) {
        messageElement.innerHTML = "Bu mesaj silindi.";
        messageElement.classList.add("deleted");
    }
    
    const reactionElement = document.createElement("span");
    reactionElement.classList.add("reaction-element");
    messageElement.appendChild(reactionElement);

    if (messageData["reactions"] && !messageData["deleted"]) {
        Object.keys(messageData["reactions"]).forEach(user => {
            addReaction(messageElement, messageData["reactions"][user], user);
        })
    }

    messageSection.appendChild(messageElement);
    scroll(messageSection);
    // if (online && !(messageData["sender"] === username)) {alert("Yeni mesaj!");}
    
    if (messageData["newDate"]) {
        const dateElement = document.createElement("span");
        dateElement.classList.add("date-element");

        const dateCreateTime = new Date(messageData["createTime"]);
        const currentTime = new Date();
        const difference = Math.floor((currentTime - dateCreateTime) / (1000 * 3600 * 24));

        if (getDateFromMS(messageData["createTime"]) === getDateFromMS(Date.now())) {
            dateElement.innerHTML = "Bugün";
        } else if (difference <= 3) {
            dateElement.innerHTML = new Intl.DateTimeFormat('tr-TR', {weekday: "long"}).format(dateCreateTime);
        } else {
            dateElement.innerHTML = getDateFromMS(messageData["createTime"]);
        }

        messageSection.insertBefore(dateElement, messageElement);
    }

    if (!messageData["deleted"]) {
        messageElement.addEventListener("contextmenu", function(e){
            e.preventDefault();
    
            const {clientX: mouseX, clientY: mouseY} = e;
    
            const {normalizedX, normalizedY} = normalizePosition(mouseX, mouseY);
            
            messageContextMenu.style.top = `${normalizedY}px`;
            messageContextMenu.style.left = `${normalizedX}px`;
    
            if (messageData["sender"] !== username && username !== "kagan") {messageDelete.style.display = "none";}
            else {messageDelete.style.display = "flex"};
    
            messageContextMenu.setAttribute("data-message", messageId);
    
            messageContextMenu.classList.toggle("active");
        })

        messageElement.addEventListener("dblclick", function(e){
            const doubleClickEmoji = "emoji-heart";
            if (reactionElement.querySelector(`img.emoji[data-user='${username}'][data-emoji='${doubleClickEmoji}']`)) {
                remove(ref(database, `messages/${messageId}/reactions/${username}`));
            } else {
                set(ref(database, `messages/${messageId}/reactions/${username}`), doubleClickEmoji);
            }
        })
        
        onChildAdded(ref(database, `messages/${messageId}/reactions/`), (child) => {
            addReaction(
                document.querySelector(`#${messageId}`), child.val(), child.key
            );
        })
        onChildChanged(ref(database, `messages/${messageId}/reactions/`), (child) => {
            addReaction(
                document.querySelector(`#${messageId}`), child.val(), child.key
            );
        })
        onChildRemoved(ref(database, `messages/${messageId}/reactions/`), (child) => {
            removeReaction(
                document.querySelector(`#${messageId}`), child.key
            );
        })

        onChildAdded(ref(database, `messages/${messageId}/`), (child) => {
            if (child.key === "deleted") {
                messageElement.innerHTML = "Bu mesaj silindi.";
                messageElement.classList.add("deleted");
            }
        })
    }

}

[...messageReactions].forEach(reaction => {
    reaction.addEventListener("click", function(e){
        const messageId = messageContextMenu.getAttribute("data-message");
        const emojiToReact = reaction.querySelector("img").className;
        get(child(dbRef, `messages/${messageId}/reactions/${username}`)).then(snapshot => {
            if (snapshot.exists() && (snapshot.val() === emojiToReact)) {
                remove(ref(database, `messages/${messageId}/reactions/${username}`));
            }
            else {
                set(ref(database, `messages/${messageId}/reactions/${username}`), emojiToReact);
            }
        });
        messageContextMenu.classList.remove("active");
    })
})

function addReaction(messageElement, emoji, user) {
    const reactionElement = messageElement.querySelector("span.reaction-element");
    let emojiElement = reactionElement.querySelector(`img.emoji[data-user='${user}']`);
    
    if (!emojiElement) {
        emojiElement = document.createElement("img");
        emojiElement.classList.add("emoji");
        emojiElement.setAttribute("data-user", user);
        emojiElement.draggable = false;
    } 
    emojiElement.src = `./imgs/emojis/${emoji}.png`;
    emojiElement.alt = emojis[emoji];
    emojiElement.setAttribute("data-emoji", emoji);
    
    reactionElement.classList.add("active");
    messageElement.classList.add("reacted");
    reactionElement.appendChild(emojiElement);
}

function removeReaction(messageElement, user) {
    const reactionElement = messageElement.querySelector("span.reaction-element")
    const emojiElement = reactionElement.querySelector(`img.emoji[data-user='${user}']`);
    reactionElement.removeChild(emojiElement);
    if (!reactionElement.firstChild) {reactionElement.classList.remove("active"); messageElement.classList.remove("reacted")};
}

document.addEventListener("load", (e) => {
    scroll(messageSection);
});

messageSend.addEventListener("click", function(e){
    sendMessageToDB();
});

messageInput.addEventListener("keydown", function(e){
    if (e.keyCode === 13) {sendMessageToDB();}
});

messageDelete.addEventListener("click", function(e){
    const messageId = messageContextMenu.getAttribute("data-message");
    set(ref(database, `messages/${messageId}/deleted`), true);
    messageContextMenu.classList.remove("active");
})


showAppOptions.addEventListener("click", function(e){
    showAppOptions.classList.toggle("active");
    document.querySelector(".option-color .user-color-picker").classList.remove("active");
});

userColorInput.addEventListener("change", function(e){
    get(child(dbRef, `users/${username}`)).then((snapshot) => {
        if (snapshot.exists()) {
            set(ref(database, `users/${username}/color`), e.target.value);
            alert("Renk başarıyla değiştirildi!");
            showAppOptions.classList.remove("active");
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
                showAppOptions.classList.remove("active");
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
            const profilePhoto = e.target.files[0];
            const reader = new FileReader();

            reader.addEventListener("load", ()=>{
                set(ref(database, `users/${username}/profilePhoto`), reader.result);
            })

            reader.readAsDataURL(profilePhoto);
            alert("Profil fotoğrafı başarıyla eklendi!");
            showAppOptions.classList.remove("active");
        }
    }).catch((error) => {
            alert("Bir hata oluştu!");
            console.log(error);
        }
    )
})

photoInput.addEventListener("change", function(e){
    const photoToUpload = e.target.files[0];
    const reader = new FileReader();

    const previewElement = photoPreview.querySelector("img") ?? document.createElement("img");
    reader.addEventListener("load", ()=>{
        previewElement.src = reader.result;
    })
    reader.readAsDataURL(photoToUpload);
    
    photoPreview.appendChild(previewElement);
    photoPreview.style.display = "block";
    photoInput.value = "";
})

photoDelete.addEventListener("click", function(e){
    photoPreview.style.display = "none";
    photoInput.value = "";
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
    scroll(messageSection);
})

document.body.addEventListener("click", function(e){
    if (e.target !== messageContextMenu && !messageContextMenu.contains(e.target)) {
        messageContextMenu.classList.remove("active");
    }
    if (e.target !== showAppOptions && e.target !== appOptions && !appOptions.contains(e.target)) {
        showAppOptions.classList.remove("active");
    }
})

document.addEventListener('visibilitychange', function() {
    if (username) {
        if (document.visibilityState == 'hidden') { 
            set(ref(database, `users/${username}/status`), "offline");
        } else if (document.visibilityState == 'visible') {
            set(ref(database, `users/${username}/status`), "online");
        }
    }
});
