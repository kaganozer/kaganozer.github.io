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

const ilceler = {
    "Bayraklı": {
        "id": "bayrakli",
        "yazarlar": {
            "Homeros": {
                "id": "homeros",
                "info": "Homeros, Antik Çağ'da yaşamış İyonyalı ozan.",
                "eserler": []
            }
        }
    },
    "Çiğli": {
        "id": "cigli",
        "yazarlar": {
            "Hidayet Karakuş": {
              "id": "hidayet-karakus",
              "info": "",
              "eserler": []
            }
        }
    },
    "Karabağlar": {
        "id": "karabaglar",
        "yazarlar": {
            "Reşat Nuri Güntekin": {
              "id": "resat-nuri",
              "info": "Reşat Nuri Güntekin, Türk roman, öykü ve oyun yazarıdır.",
              "eserler": []
            }
        }
    },
    "Karşıyaka": {
        "id": "karsiyaka",
        "yazarlar": {
            "Attila İlhan": {
              "id": "attila-ilhan",
              "info": "Attilâ İlhan, Türk şair, romancı, düşünür, deneme yazarı, gazeteci, senarist ve eleştirmen.",
              "eserler": []
            },
            "İhsan Oktay Anar": {
              "id": "ihsan-oktay",
              "info": "",
              "eserler": []
            },
            "Veysel Çolak": {
              "id": "veysel-colak",
              "info": "",
              "eserler": []
            }
        }
    },
    "Urla": {
        "id": "urla",
        "yazarlar": {
            "Necati Cumalı": {
              "id": "necati-cumali",
              "info": "",
              "eserler": []
            },
            "Neyzen Tevfik": {
              "id": "neyzen-tevfik",
              "info": "",
              "eserler": []
            },
            "Yorgos Seferis": {
              "id": "yorgos-seferis",
              "info": "",
              "eserler": []
            }
        }
    }
};

// import ilceler from "./data.json" assert {type: "json"};
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
