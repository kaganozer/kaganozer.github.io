const emojis = {
    "emoji-heart": "❤",
    "emoji-smile": "🙂",
    "emoji-cry": "😢",
    "emoji-surprise": "😮",
    "emoji-angry": "😠",
    "emoji-thumbs-up": "👍"
};



[...document.querySelectorAll("div.emoji")].forEach(el => {
    const image = document.createElement("img");
    const emojiName = el.getAttribute("data-emoji");
    image.src = `./imgs/emojis/${emojiName}.png`;
    image.alt = emojis[emojiName];
    image.classList.add(emojiName);
    image.draggable = false;
    el.replaceWith(image);
})
