document.querySelectorAll("a").forEach(element => {
    element.addEventListener("click", function(){
        document.querySelector("#hamBtn").checked = false;
    });
})

document.querySelector("#mobileTheme").addEventListener("change", function(){
    if (document.querySelector("#mobileTheme").checked){
        document.documentElement.className = "theme-light";
    } else {
        document.documentElement.className = "theme-dark";
    }
})


class Accordion {
    constructor(el) {
        this.el = el;
        this.summary = el.querySelector(".summary");
        this.content = el.querySelector(".content");

        this.isClosed = true;
        this.summary.offsetHeight = 50;
        console.log(this.summary.offsetHeight);
        this.el.style.height = `${this.summary.offsetHeight}px`;
        this.summary.addEventListener("click", e => this.onClick(e));
    }

    onClick(e) {
        if (this.isClosed) {
            this.el.style.height = `${this.summary.offsetHeight + this.content.offsetHeight}px`
            this.isClosed = false;
            this.el.setAttribute("open", true);
        } else {
            this.el.style.height = `${this.summary.offsetHeight}px`
            this.isClosed = true;
            this.el.removeAttribute("open");
        }
    }
}
