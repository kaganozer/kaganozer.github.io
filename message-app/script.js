import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getDatabase, ref, set, push, child, remove, get, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database);

const loginContainer = document.querySelector("div.message-app-login");
const loginInput = document.querySelector("input#login-name-input");
const loginSubmit = document.querySelector("div.login-submit");

const messageContainer = document.querySelector("div.message-app-container");
const messageSection = document.querySelector("div.message-section");
const messageInput = document.querySelector("input#message-input");
const messageTyping = document.querySelector("span.message-typing");
const typingUsers = document.querySelector("span.typing-users");
const appTitle = document.querySelector(".title");

let username;
let online;
const status = {
    "online": "#71eb8d",
    "offline": "#616066",
    "dnd": "#b84435"
};
const prefix = "$";

function scroll(el) {el.scrollTop = el.scrollHeight;}

function login(){
    username = loginInput.value;
    if (username) {
        get(child(dbRef, `users/${username}`)).then((snapshot) => {
            if (snapshot.val()?.permissions?.admin) {
                const password = prompt("Password for admin account");
                if (password !== snapshot.val()["password"]) {
                    alert("Wrong password!");
                    return;
                }
            }

            if (!snapshot.exists()) {
                const userData = {
                    "createTime": Date.now(),
                    "profilePhoto": "./imgs/default-avatar.png",
                    "status": "online"
                }
                set(ref(database, `users/${username}`), userData);
            }

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

            loginContainer.style.display = "none";
            messageContainer.style.display = "grid";
            scroll(messageSection);
            messageInput.focus();
            appTitle.innerHTML = username;
            online = true;
        })

        get(child(dbRef, "users")).then((snapshot) => {
            if (snapshot.exists()){
                Object.keys(snapshot.val()).forEach(user => {
                    onChildChanged(ref(database, `users/${user}/`), (child) => {
                        if (child.key === "status") {
                            [...document.querySelectorAll(`.message-element[data-user='${user}'] .user-status`)].forEach(el => {
                                el.style["background-color"] = status[child.val()];
                            });
                        }
                        if (child.key === "color") {
                            [...document.querySelectorAll(`.message-element[data-user='${user}'] .message-username`)].forEach(el => {
                                el.style["color"] = child.val();
                            });
                        }
                        if (child.key === "profilePhoto") {
                            [...document.querySelectorAll(`.message-element[data-user='${user}'] .message-photo`)].forEach(el => {
                                el.src = child.val();
                            });
                        }
                    });

                    onChildAdded(ref(database, `users/${user}`), (child) => {
                        if (child.key === "typing") {
                            const userElement = document.createElement("span");
                            if (typingUsers.firstChild) {userElement.innerHTML = ", ";}
                            else {messageTyping.classList.add("active");}
                            userElement.innerHTML += user;
                            userElement.setAttribute("data-user", user);
                            typingUsers.appendChild(userElement);
                        }
                    })

                    onChildRemoved(ref(database, `users/${user}`), (child) => {
                        if (child.key === "typing") {
                            const userElement = typingUsers.querySelector(`span[data-user='${user}']`);
                            typingUsers.removeChild(userElement);
                            if (!typingUsers.firstChild) {messageTyping.classList.remove("active");}
                            else {typingUsers.firstChild.innerHTML = typingUsers.firstChild.innerHTML.replace(", ", "");}
                        }
                    })
                })
            }
        })
        
        set(ref(database, `users/${username}/status`), username === "system" ? "dnd" : "online");
    }
}

loginSubmit.addEventListener("click", function(e){login();})
loginInput.addEventListener("keydown", function(e){if (e.keyCode === 13) {login()};})

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

function sendMessageToDB(user, text, image=null, deleteAfter=false){
    if (!online) {return;}
    if (!text && !image) {return;}
    
    const createTime = new Date();

    const messageInfo = {
        "sender": user,
        "createTime": createTime.getTime()
    };

    if (image) {messageInfo["imageURL"] = image};
    if (text) {messageInfo["content"] = text};
    if (deleteAfter) {messageInfo["deleteAfter"] = true};
    if (text.startsWith(prefix)) {messageInfo["command"] = true;}

    get(child(dbRef, "messages")).then((snapshot) => {
        if (snapshot.exists()) {
            const messagesArr = Object.keys(snapshot.val());
            const previousMessageId = messagesArr[messagesArr.length-1];
            
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
            messageInfo["newDate"] = true;
            messageInfo["newMessageFromUser"] = true;
        }

        const messageRef = push(ref(database, "messages"));
        set(messageRef, messageInfo);
    })
}

onChildAdded(ref(database, `messages/`), (snapshot) => {
    if (online) {
        sendMessage(snapshot.key, snapshot.val());
    }
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
                userStatus.style["background-color"] = status[snapshot.val()["status"]];
            }
        })

        messageElement.appendChild(userPhoto);
        messageElement.appendChild(userStatus);
        messageElement.appendChild(messageName);
    }
    
    if (messageData["sender"] === username) {messageElement.classList.add("message-sent");}
    else {messageElement.classList.add("message-received");}

    if (messageData["deleteAfter"]) {
        setTimeout(function(){
            remove(ref(database, `messages/${messageId}`));
        }, 1500);
    }
    
    messageElement.setAttribute("data-time", getTimeFromMS(messageData["createTime"]));
    
    if (image) {
        const imageContent = document.createElement("img");
        imageContent.classList.add("image-content");
        imageContent.setAttribute("src", image);
        messageElement.appendChild(imageContent);
        messageElement.classList.add("image");
        photoPreview.style.display = "none";
        const previewElement = photoPreview.querySelector("img")
        if (previewElement) {photoPreview.removeChild(previewElement);}
    } if (text) {
        const messageContent = document.createElement("span");
        messageContent.classList.add("message-content");

        // * Message formatting
        // link: https://
        // bold: *text*
        // italic: _text_
        // strike through: -text-
        // underline: !text!
        // embed: `text`
        // https://stackoverflow.com/questions/15278728/regular-expression-formatting-text-in-a-block-im
        const linkPattern  = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        const boldPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])\*(\S.*?\S)\*($|<\/.>|[\s\W_])/g;
        const italicsPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W])_(\S.*?\S)_($|<\/.>|[\s\W])/g;
        const strikethroughPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])-(\S.*?\S)-($|<\/.>|[\s\W_])/gi;
        const underlinePattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])!(\S.*?\S)!($|<\/.>|[\s\W_])/gi;
        const embedPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])`(\S.*?\S)`($|<\/.>|[\s\W_])/gi;
        messageContent.innerHTML =
            text.replace(linkPattern, "<a href=\"$1\">$1</a>")
                .replace(strikethroughPattern, "$1<s>$2</s>$3")
                .replace(italicsPattern, "$1<i>$2</i>$3")
                .replace(boldPattern, "$1<b>$2</b>$3")
                .replace(underlinePattern, "$1<u>$2</u>$3")
                .replace(embedPattern, "$1<code>$2</code>$3");

        // * Bot commands
        if (messageData["command"]) {
            remove(ref(database, `messages/${messageId}/command`));
            const errors = {
                user: "Belirtilen kullanıcı bulunamadı.",
                command: "Belirtilen komut bulunamadı.",
                permission: "Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz."
            }
            const commands = {
                // Fun commands
                sa: {
                    handler: function() {
                        sendMessageToDB("system", "as");
                    },
                    info: "Bot `as` şeklinde cevap verir."
                },
                // User commands
                id: {
                    handler: function(user=username) {
                        get(child(dbRef, `users/${user}`)).then((snapshot) => {
                            if (snapshot.exists()) {sendMessageToDB("system", `*${user}* adlı kullanıcının ID'si: ${snapshot.val()["createTime"]}`);}
                            else {sendMessageToDB("system", errors["user"]);}
                        })
                    },
                    info: "Girilen kullanıcının ID'sini gösterir."
                },
                avatar: {
                    handler: function(user=username) {
                        get(child(dbRef, `users/${user}`)).then((snapshot) => {
                            if (snapshot.exists()) {sendMessageToDB("system", `*${user}* adlı kullanıcının profil fotoğrafı`, snapshot.val()["profilePhoto"]);}
                            else {sendMessageToDB("system", errors["user"]);}
                        })
                    },
                    info: "Girilen kullanıcının profil fotoğrafını gösterir."
                },
                // Admin commands
                delete: {
                    permissions: ["admin"],
                    handler: function(amount=1) {
                        get(child(dbRef, "messages")).then((snapshot) => {
                            const messagesArr = Object.keys(snapshot.val()).reverse();
                            amount = (amount === "all") ? messagesArr.length : amount;
                            const feedBack = (amount === "all") ? "Bütün mesajlar silindi." : `${amount} adet mesaj silindi.`;
                            for (let i=0; i<(+amount)+1; i++) {
                                remove(ref(database, `messages/${messagesArr[i]}`));
                            }
                            sendMessageToDB("system", feedBack, null, true);
                        })
                    },
                    info: "Girilen miktarda mesajı siler."
                },
                help: {
                    handler: function(command=null) {
                        const getInfo = (c) => {
                            if (!commands[c]["info"]) {return;}
                            return `*$${c}:* ${commands[c]["info"]}` + (commands[c]["permissions"] ? `<br>Gerekli izinler: \`${commands[c]["permissions"]}\`<br>` : "<br>");
                        }
                        let feedBack = "";
                        if (command) {
                            feedBack += getInfo(command);
                            if (!commands[command]) {sendMessageToDB("system", errors["command"]); return;}
                        } else {
                            feedBack += `Bot komut prefix'i: ${prefix}<br><br>`;
                            Object.keys(commands).forEach(c => {
                                feedBack += getInfo(c);
                            });
                        }
                        sendMessageToDB("system", feedBack);
                    },
                    info: "Komut bilgilerini gösterir."
                }
            }
            const textSplit = text.slice(1).split(" ");
            const command = textSplit[0];
            const params = textSplit.slice(1);
            get(child(dbRef, `users/${messageData["sender"]}`)).then((snapshot) => {
                if (commands[command]) {
                    const userPermissions = snapshot.val()["permissions"];
                    const commandPermissions = commands[command]["permissions"];
                    if (!commandPermissions) {
                        commands[command].handler(...params);
                    } else if (commandPermissions && !userPermissions) {
                        sendMessageToDB("system", errors["permission"]);
                    } else if (commandPermissions.filter(perm => userPermissions[perm]).length) {
                        commands[command].handler(...params);
                    } else {
                        sendMessageToDB("system",errors["permission"]);
                    }
                }
            })
        }
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
    
    if (!messageData["deleted"] || !messageElement.classList.contains("deleted")) {
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

onChildRemoved(ref(database, `messages/`), (snapshot) => {
    if (online) {
        const messageElement = document.querySelector(`#${snapshot.key}`);
        const previousElement = messageElement.previousElementSibling;
        const nextElement = messageElement.nextElementSibling;
        if (previousElement.classList.contains("date-element") && (!nextElement || nextElement.classList.contains("date-element"))) {
            messageSection.removeChild(previousElement);
        };
        messageSection.removeChild(messageElement);
    }
});

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
    sendMessageToDB(username, messageInput.value, document.querySelector("span.photo-preview img")?.src);
});

messageInput.addEventListener("keydown", function(e){
    if (e.keyCode === 13) {sendMessageToDB(username, messageInput.value, document.querySelector("span.photo-preview img")?.src);}
});

messageInput.addEventListener("keyup", function(e){    
        if (e.target.value) {set(ref(database, `users/${username}/typing`), true);}
        else {remove(ref(database, `users/${username}/typing`));}
})

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
    
    if (!photoPreview.contains(previewElement)) {photoPreview.appendChild(previewElement);}
    photoPreview.style.display = "block";
    photoInput.value = "";
})

photoDelete.addEventListener("click", function(e){
    photoPreview.style.display = "none";
    const previewElement = photoPreview.querySelector("img");
    photoPreview.removeChild(previewElement);
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
    if (username && username !== "system") {
        if (document.visibilityState == 'hidden') { 
            set(ref(database, `users/${username}/status`), "offline");
            remove(ref(database, `users/${username}/typing`));
        } else if (document.visibilityState == 'visible') {
            set(ref(database, `users/${username}/status`), "online");
            if (messageInput.value){set(ref(database, `users/${username}/typing`), true);}
        }
    }
});
