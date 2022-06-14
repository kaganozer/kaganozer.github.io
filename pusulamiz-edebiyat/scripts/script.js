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
    ilceLi.classList.toggle("ilce");
    ilceLi.id = ilceler[ilce]["id"];
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.innerHTML = ilce;
    details.appendChild(summary);
    const content = document.createElement("div");
    content.classList.toggle("content");
    Object.keys(ilceler[ilce]["yazarlar"]).forEach((yazar) => {
        const yazarLi = document.createElement("li");
        const yazarA = document.createElement("a");
        yazarA.href = "#"; yazarA.classList.toggle("yazar"); yazarA.id = ilceler[ilce]["yazarlar"][yazar]["id"];
        const yazarImg = document.createElement("img")
        yazarImg.src = `imgs/${yazarA.id}.png`; yazarImg.alt = yazar;
        yazarA.appendChild(yazarImg);
        const yazarInfo = document.createElement("div");
        yazarInfo.classList.toggle("yazar-info");
        const yazarH2 = document.createElement("h2");
        yazarH2.innerHTML = yazar;
        yazarInfo.appendChild(yazarH2);
        yazarA.appendChild(yazarInfo);
        yazarLi.appendChild(yazarA);
        content.appendChild(yazarLi);    
    })
    details.appendChild(content);
    ilceLi.appendChild(details);
    ilcelerDiv.appendChild(ilceLi);
})
