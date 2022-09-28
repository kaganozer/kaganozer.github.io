import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getDatabase, ref, set, push, child, remove, get, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database);

const loader = document.querySelector("div.message-app-loader");
const loaderName = document.querySelector("div.loader-name");

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

function login(user, askForPassword=true){
    get(child(dbRef, `users/${user}`)).then((snapshot) => {
        if (snapshot.val()?.permissions?.admin && askForPassword) {
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
                "status": "online",
                "userAgent": navigator.userAgent
            }
            set(ref(database, `users/${user}`), userData);
        } else {
            set(ref(database, `users/${user}/status`), user === "system" ? "dnd" : "online");
            set(ref(database, `users/${user}/userAgent`), navigator.userAgent);
        }

        get(child(dbRef, "messages")).then((snapshot) => {
            if (snapshot.exists()){
                snapshot.forEach(message => {
                    sendMessage(message.key, message.val());
                })
            }

            loginContainer.style.display = "none";
            messageContainer.style.display = "grid";
            scroll(messageSection);
            messageInput.focus();
            appTitle.textContent = user;
            online = true;
            // document.body.innerHTML = messageContainer.outerHTML;
        });
    })

    get(child(dbRef, "users")).then((snapshot) => {
        if (snapshot.exists()){
            snapshot.forEach(user => {
                onChildChanged(ref(database, `users/${user.key}/`), (child) => {
                    if (child.key === "status") {
                        [...document.querySelectorAll(`.message-element[data-user='${user.key}'] .user-status`)].forEach(el => {
                            el.style["background-color"] = status[child.val()];
                        });
                    }
                    if (child.key === "color") {
                        [...document.querySelectorAll(`.message-element[data-user='${user.key}'] .message-username`)].forEach(el => {
                            el.style["color"] = child.val();
                        });
                    }
                    if (child.key === "profilePhoto") {
                        [...document.querySelectorAll(`.message-element[data-user='${user.key}'] .message-photo`)].forEach(el => {
                            el.src = child.val();
                        });
                    }
                });

                onChildAdded(ref(database, `users/${user.key}`), (child) => {
                    if (child.key === "typing") {
                        const userElement = document.createElement("span");
                        if (typingUsers.firstChild) {userElement.textContent = ", ";}
                        else {messageTyping.classList.add("active");}
                        userElement.textContent += user.key;
                        userElement.setAttribute("data-user", user.key);
                        typingUsers.appendChild(userElement);
                    }
                })

                onChildRemoved(ref(database, `users/${user.key}`), (child) => {
                    if (child.key === "typing") {
                        const userElement = typingUsers.querySelector(`span[data-user='${user.key}']`);
                        typingUsers.removeChild(userElement);
                        if (!typingUsers.firstChild) {messageTyping.classList.remove("active");}
                        else {typingUsers.firstChild.textContent = typingUsers.firstChild.textContent.replace(", ", "");}
                    }
                })
            })
        }
    })
}

loginSubmit.addEventListener("click", function(e){
    username = loginInput.value.toLowerCase().trim();
    if (username) {login(username);}
});
loginInput.addEventListener("keydown", function(e){
    if (e.keyCode === 13) {
        username = loginInput.value.toLowerCase().trim();
        if (username) {login(username);}
    };
});

const messageSend = document.querySelector("span.send-message");
const messageContextMenu = document.querySelector("div.message-context-menu");
const messageReactions = document.querySelectorAll("span.reaction");
const messageDelete = document.querySelector("span.message-delete");
const messageReply = document.querySelector("span.message-reply");
const replyPreview = document.querySelector("span.reply-preview");
const replyCancel = document.querySelector("span.reply-cancel");
const photoPreview = document.querySelector("span.photo-preview");
const showAppOptions = document.querySelector("button.dots");
const appOptions = document.querySelector("span.options");
const photoInput = document.querySelector("input#photoUpload");
const photoDelete = document.querySelector("span.delete-photo");
const scrollToBottom = document.querySelector("div.scroll");
const userColorInput = document.querySelector("input#user-color-picker");
const profilePhotoInput = document.querySelector("input#user-photo-picker");
const logoutButton = document.querySelector("li.logout");

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

function sendMessageToDB(user, text, image=null, replied=null, deleteAfter=false){
    if (!online) {return;}
    if (!text && !image) {return;}

    const createTime = new Date();

    const messageInfo = {
        "sender": user,
        "createTime": createTime.getTime()
    };

    if (image) {messageInfo["imageURL"] = image;}
    if (text) {messageInfo["content"] = text;}
    if (replied) {messageInfo["replied"] = replied;}
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
        messageName.textContent = messageData["sender"];

        const userPhoto = document.createElement("img");
        userPhoto.classList.add("message-photo");

        const userStatus = document.createElement("span");
        userStatus.classList.add("user-status");

        get(child(dbRef, `users/${messageData["sender"]}`)).then((snapshot) => {
            if (snapshot.exists()) {
                messageName.style.color = snapshot.val()["color"];
                userPhoto.src = snapshot.val()["profilePhoto"];
                userStatus.style["background-color"] = status[snapshot.val()["status"]];
            } else {
                messageName.textContent += " (deleted)";
                userPhoto.src = "./imgs/default-avatar.png";
                userStatus.style["background-color"] = status["offline"];
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

        // TODO: Message formatting
        // https://stackoverflow.com/questions/15278728/regular-expression-formatting-text-in-a-block-im
        const patterns = {
            // link: {
            //     pattern: /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
            //     replace: "<a href=\"$1\">$1</a>"
            // },
            bold: {
                pattern: /(?![^<]*<\/a>)(^|<.>|[\s\W_])\*(\S.*?\S)\*($|<\/.>|[\s\W_])/g,
                replace: "$1<b>$2</b>$3",
                character: "*"
            },
            italic: {
                pattern: /(?![^<]*<\/a>)(^|<.>|[\s\W])_(\S.*?\S)_($|<\/.>|[\s\W])/g,
                replace: "$1<i>$2</i>$3",
                character: "_"
            },
            strikethrough: {
                pattern: /(?![^<]*<\/a>)(^|<.>|[\s\W_])-(\S.*?\S)-($|<\/.>|[\s\W_])/gi,
                replace: "$1<s>$2</s>$3",
                character: "-"
            },
            underline: {
                pattern: /(?![^<]*<\/a>)(^|<.>|[\s\W_])!(\S.*?\S)!($|<\/.>|[\s\W_])/gi,
                replace: "$1<u>$2</u>$3",
                character: "*"
            },
            embed: {
                pattern: /(?![^<]*<\/a>)(^|<.>|[\s\W_])`(\S.*?\S)`($|<\/.>|[\s\W_])/gi,
                replace: "$1<code>$2</code>$3",
                character: "`"
            }
        };

        messageContent.textContent = text;

        // * Bot commands
        if (messageData["command"]) {
            remove(ref(database, `messages/${messageId}/command`));
            const errors = {
                user: "Belirtilen kullanıcı bulunamadı.",
                command: "Belirtilen komut bulunamadı.",
                permission: "Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.",
                invalid: "Geçersiz komut biçimi."
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
                        if (!(amount === "all") && isNaN(amount)) {sendMessageToDB("system", errors["invalid"]); return;}
                        get(child(dbRef, "messages")).then((snapshot) => {
                            const messagesArr = Object.keys(snapshot.val()).reverse();

                            let feedBack;
                            if (messageData["replied"]) {
                                remove(ref(database, `messages/${messageData["replied"]}`));
                                feedBack = "Belirtilen mesaj silindi.";
                            } else {
                                if (amount === "all") {
                                    amount = messagesArr.length;
                                    feedBack = "Bütün mesajlar silindi.";
                                } else {feedBack = `${amount} adet mesaj silindi.`;}

                                for (let i=0; i<(+amount)+1; i++) {
                                    remove(ref(database, `messages/${messagesArr[i]}`));
                                }
                            }

                            sendMessageToDB("system", feedBack, null, null, true);
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
                if (snapshot.key === username && commands[command]) {
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
        if (messageData["sender"] === username) {messageInput.value = ""};
    }
    
    if (messageData["replied"]) {
        const replyTo = messageData["replied"];
        const repliedMessage = document.querySelector(`#${replyTo}`);
        const repliedName = repliedMessage?.getAttribute("data-user") ?? null;
        
        get(child(dbRef, `users/${repliedName}`)).then((child) => {
            const replyElement = document.createElement("span");
            replyElement.classList.add("message-reply");
            const replyContent = document.createElement("span");
            replyContent.classList.add("message-reply-content");
            
            const repliedContent = repliedMessage.querySelector(".message-content");
            const repliedImage = repliedMessage.querySelector(".image-content");
            
            const replyName = document.createElement("span");
            replyName.classList.add("message-reply-name");
            
            if (child.exists()) {
                if (child.val()["color"]) {replyElement.style.setProperty("--reply-color", child.val()["color"]);}
                replyName.textContent = repliedName;
            } else {replyName.textContent = "deleted-user";}
            
            const contentLimit = 300;
            if (repliedContent) {
                if (repliedContent.textContent.length > contentLimit) {replyContent.textContent = repliedContent.textContent.slice(0, contentLimit) + "...";}
                else {replyContent.textContent = repliedContent.textContent;}
            }
            else if (repliedImage) {
                replyContent.innerHTML = "<i class='fa-solid fa-image'></i>Fotoğraf";
            }
            
            if (repliedMessage.classList.contains("deleted")) {
                replyContent.textContent = "Bu mesaj silindi.";
                replyContent.style["font-style"] = "italic";
                replyElement.appendChild(replyContent);
            }

            replyElement.appendChild(replyName);
            replyElement.appendChild(replyContent);
            
            replyElement.addEventListener("click", function(e){
                repliedMessage.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center"
                })
                repliedMessage.style["animation"] = "reply-fade 1s ease-in";
                setTimeout(function(){repliedMessage.style["animation"]="";}, 1000);
            });

            messageElement.appendChild(replyElement);
            messageElement.classList.add("message-replied");
            cancelMessageReply();
        });

    }

    const reactionElement = document.createElement("span");
    reactionElement.classList.add("reaction-element");
    const emojiCount = document.createElement("span");
    emojiCount.classList.add("emoji-count");
    emojiCount.textContent = 0;
    reactionElement.appendChild(emojiCount);
    messageElement.appendChild(reactionElement);
    
    if (messageData["reactions"]) {
        Object.keys(messageData["reactions"]).forEach(user => {
            addReaction(messageElement, messageData["reactions"][user], user);
        })
    }
    
    messageSection.appendChild(messageElement);
    remove(ref(database, `users/${username}/typing`));
    scroll(messageSection);
    
    if (messageData["newDate"]) {
        const dateElement = document.createElement("span");
        dateElement.classList.add("date-element");
        
        const dateCreateTime = new Date(messageData["createTime"]);
        const currentTime = new Date();
        const difference = Math.floor((currentTime - dateCreateTime) / (1000 * 3600 * 24));
        
        if (getDateFromMS(messageData["createTime"]) === getDateFromMS(Date.now())) {
            dateElement.textContent = "Bugün";
        } else if (difference <= 3) {
            dateElement.textContent = new Intl.DateTimeFormat('tr-TR', {weekday: "long"}).format(dateCreateTime);
        } else {
            dateElement.textContent = getDateFromMS(messageData["createTime"]);
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
            get(child(dbRef, `messages/${messageId}/reactions/${username}`)).then(snapshot => {
                if (snapshot.exists() && snapshot.val() === doubleClickEmoji) {
                    remove(ref(database, `messages/${messageId}/reactions/${username}`));
                } else {
                    set(ref(database, `messages/${messageId}/reactions/${username}`), doubleClickEmoji);
                }
            });
        });

        if (messageData["deleted"]) {deleteMessage(messageElement);}
        
        onChildAdded(ref(database, `messages/${messageId}/reactions/`), (child) => {
            addReaction(
                document.querySelector(`#${messageId}`), child.val(), child.key
            );
        });
        onChildChanged(ref(database, `messages/${messageId}/reactions/`), (child) => {
            addReaction(
                document.querySelector(`#${messageId}`), child.val(), child.key, true
            );
        });
        onChildRemoved(ref(database, `messages/${messageId}/reactions/`), (child) => {
            removeReaction(
                document.querySelector(`#${messageId}`), child.val(), child.key
            );
        });
        
        onChildAdded(ref(database, `messages/${messageId}/`), (child) => {
            if (child.key === "deleted") {deleteMessage(messageElement);}
        });
    }
}

function deleteMessage(messageElement) {
    let messageContent = messageElement.querySelector(".message-content") ?? document.createElement("span");
    const imageContent = messageElement.querySelector(".image-content");
    const replyContent = messageElement.querySelector("span.message-reply");
    console.log(replyContent);
    console.log(messageElement.innerHTML);
    const reactions = messageElement.querySelector(".reaction-element");
    if (imageContent) {messageElement.removeChild(imageContent);}
    if (replyContent) {messageElement.removeChild(replyContent);}
    if (reactions) {messageElement.removeChild(reactions);}
    messageContent.classList.add("message-content");
    messageContent.textContent = "Bu mesaj silindi.";
    if (!messageElement.contains(messageContent)) {messageElement.appendChild(messageContent);}
    messageElement.classList.add("deleted");
}

onChildRemoved(ref(database, `messages/`), (snapshot) => {
    if (online) {
        const messageElement = document.querySelector(`#${snapshot.key}`);
        const previousElement = messageElement.previousElementSibling;
        const nextElement = messageElement.nextElementSibling;
        if (messageElement.classList.contains("message-new") && nextElement && (nextElement.getAttribute("data-user") === messageElement.getAttribute("data-user"))) {
            nextElement.classList.add("message-new");
            set(ref(database, `messages/${nextElement.id}/newMessageFromUser`), true);
        }
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

function addReaction(messageElement, emoji, user, changed=false) {
    if (messageElement.classList.contains("deleted")) {return;}
    const reactionElement = messageElement.querySelector("span.reaction-element");
    const emojiElements = reactionElement.querySelectorAll("img.emoji");
    let emojiElement = reactionElement.querySelector(`img.emoji[data-user='${user}']`);
    const emojiCount = reactionElement.querySelector("span.emoji-count");

    if (!emojiElement) {
        emojiElement = document.createElement("img");
        emojiElement.classList.add("emoji");
        emojiElement.setAttribute("data-user", user);
        emojiElement.draggable = false;
    }

    emojiElement.src = `./imgs/emojis/${emoji}.png`;
    emojiElement.setAttribute("data-emoji", emoji);
    const sameEmojiExists = [...emojiElements].filter(e => e.getAttribute("data-emoji") === emoji);

    get(child(dbRef, `messages/${messageElement.id}/reactions`)).then((snapshot) => {
        emojiCount.textContent = Object.keys(snapshot.val()).length;
    });

    reactionElement.classList.add("active");
    messageElement.classList.add("reacted");
    if (!(sameEmojiExists.length)) {reactionElement.insertBefore(emojiElement, emojiCount);}
    else if (changed) {reactionElement.removeChild(emojiElement);}
}

function removeReaction(messageElement, emoji,  user) {
    const reactionElement = messageElement.querySelector("span.reaction-element")
    const emojiElement = reactionElement.querySelector(`img.emoji[data-user='${user}']`);
    const emojiCount = reactionElement.querySelector("span.emoji-count");
    get(child(dbRef, `messages/${messageElement.id}/reactions`)).then((snapshot) => {
        if (snapshot.exists) {
            emojiCount.textContent = Object.keys(snapshot.val()).length;
            const sameEmojiExists = Object.values(snapshot.val()).filter(e => e === emoji);
            if (!(sameEmojiExists.length)) {
                reactionElement.removeChild(emojiElement);
            }
        }
        else {
            emojiCount.textContent = "";
            reactionElement.removeChild(emojiElement);
        }
    });
    if (!reactionElement.querySelector("img.emoji")) {reactionElement.classList.remove("active"); messageElement.classList.remove("reacted")};
}

window.addEventListener("load", (e) => {
    setTimeout(
        function(){loader.style["display"] = "none";}, 1500
    );
    get(child(dbRef, "users")).then(snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(user => {
                if (user.val()["userAgent"] === navigator.userAgent) {
                    if (user.val()["status"] === "online") {
                        const errorElement = document.querySelector(".message-app-login-error");
                        errorElement.style["display"] = "block";
                        document.body.innerHTML = errorElement.outerHTML;
                        return;
                    }
                    username = user.key
                    login(username, false);
                }
            })
        }
    })
});

messageSend.addEventListener("click", function(e){
    sendMessageToDB(
        username,
        messageInput.value,
        document.querySelector("span.photo-preview img")?.src,
        document.querySelector("span.reply-preview span.reply-preview-element")?.getAttribute("data-message")
    );
});

messageInput.addEventListener("keydown", function(e){
    if (e.keyCode === 13) {
        sendMessageToDB(
            username,
            messageInput.value,
            document.querySelector("span.photo-preview img")?.src,
            document.querySelector("span.reply-preview span.reply-preview-element")?.getAttribute("data-message")
        );
    }
});

messageInput.addEventListener("keyup", function(e){
    if (e.target.value) {set(ref(database, `users/${username}/typing`), true);}
    else {remove(ref(database, `users/${username}/typing`));}
})

messageDelete.addEventListener("click", function(e){
    const messageToDelete = messageContextMenu.getAttribute("data-message");
    set(ref(database, `messages/${messageToDelete}/deleted`), true);
    messageContextMenu.classList.remove("active");
});

messageReply.addEventListener("click", function(e){
    document.querySelector(".message-replying")?.classList.remove("message-replying");

    const messageToReply = messageContextMenu.getAttribute("data-message");
    const messageReplyElement = document.querySelector(`#${messageToReply}`);
    messageReplyElement.classList.add("message-replying");

    const replyName = messageReplyElement.getAttribute("data-user");
    const previewElement = replyPreview.querySelector(".reply-preview-element") ?? document.createElement("span");
    const previewName = previewElement.querySelector(".reply-preview-name") ?? document.createElement("span");

    previewName.classList.add("reply-preview-name");
    previewName.textContent = replyName;
    if (!previewElement.contains(previewName)) {previewElement.appendChild(previewName);}
    previewElement.classList.add("reply-preview-element");
    previewElement.textContent += " kullanıcısına yanıt veriliyor.";
    previewElement.setAttribute("data-message", messageToReply);
    if (!replyPreview.contains(previewElement)) {replyPreview.insertBefore(previewElement, replyCancel);}
    replyPreview.classList.add("active");

    messageContextMenu.classList.remove("active");
});

function cancelMessageReply() {
    const previewElement = replyPreview.querySelector(".reply-preview-element");
    if (previewElement) {replyPreview.removeChild(previewElement);}
    replyPreview.classList.remove("active");
    document.querySelector(".message-replying")?.classList.remove("message-replying");
}

replyCancel.addEventListener("click", cancelMessageReply);

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

window.addEventListener("beforeunload", function() {
    if (username && username !== "system") {
        set(ref(database, `users/${username}/status`), "offline");
        remove(ref(database, `users/${username}/typing`));
    }
});

logoutButton.addEventListener("click", function(e){
    remove(ref(database, `users/${username}/userAgent`));
    location.reload();
})
