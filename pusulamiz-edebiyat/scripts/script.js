document.querySelectorAll("a").forEach(element => {
    element.addEventListener("click", function(){
        document.querySelector("#hamBtn").checked = false;
    });
})

document.querySelector("#themeMobile").addEventListener("change", function(){
    if (document.querySelector("#themeMobile").checked){
        document.documentElement.className = "theme-light";
    } else {
        document.documentElement.className = "theme-dark";
    }
})
