console.log("app.js wurde erfolgreich geladen.");

document.addEventListener("DOMContentLoaded", function () {
    console.log("HTML wurde vollständig geladen.");

    const loadRoundButton =
        document.getElementById("loadRoundButton");

    const cartButton =
        document.getElementById("cartButton");

    const navigationButtons =
        document.querySelectorAll("[data-view]");

    if (loadRoundButton) {
        loadRoundButton.addEventListener("click", function () {
            alert("JavaScript funktioniert: Speisekarte laden wurde betätigt.");
        });
    } else {
        console.error("loadRoundButton wurde nicht gefunden.");
    }

    if (cartButton) {
        cartButton.addEventListener("click", function () {
            alert("JavaScript funktioniert: Warenkorb wurde betätigt.");
        });
    } else {
        console.error("cartButton wurde nicht gefunden.");
    }

    navigationButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            alert(
                "JavaScript funktioniert: " +
                button.textContent.trim()
            );
        });
    });
});
