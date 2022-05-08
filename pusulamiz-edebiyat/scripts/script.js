/*
<div id="ilceler">
    <li class="ilce" id="aliaga">
        <details>
            <summary>Aliağa</summary>
            <div class="content">
                <li>
                    <a href="#" class="yazar" id="attila-ilhan">
                        <img src="imgs/attila-ilhan.png" alt="">
                        <div class="yazar-info">
                            <h2>Attila İlhan</h2>
                            <p>...</p> // desktop
                        </div>
                    </a>
                </li>
                <li>
                ...
    ...
*/

import ilceler from './data.json' assert {type: 'json'};
const ilcelerDiv = document.querySelector("#ilceler");

Object.keys(ilceler).forEach((ilce) => {
    const ilceLi = document.createElement("li");
    ilceLi.id = ilceler[ilce]["id"];
    ilceLi.classList.toggle("ilce");
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.innerHTML = ilce;
    details.appendChild(summary);
    const content = document.createElement("div");
    content.classList.toggle("content");
    Object.keys(ilceler[ilce]["yazarlar"]).forEach((yazar) => {
        const yazarLi = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#"; // yazar["id"].html || wikipedia
        a.id = ilceler[ilce]["yazarlar"][yazar]["id"];
        a.classList.toggle("yazar");
        const img = document.createElement("img");
        img.src = `imgs/${ilceler[ilce]["yazarlar"][yazar]["id"]}.png`;
        img.alt = yazar;
        a.appendChild(img);
        const yazarInfo = document.createElement("div");
        yazarInfo.classList.toggle("yazar-info");
        const yazarIsim = document.createElement("h2");
        yazarIsim.innerHTML = yazar;
        yazarInfo.appendChild(yazarIsim);
        a.appendChild(yazarInfo);
        yazarLi.appendChild(a);
        content.appendChild(yazarLi);
    })
    details.appendChild(content);
    ilceLi.appendChild(details);
    ilcelerDiv.append(ilceLi);
})

