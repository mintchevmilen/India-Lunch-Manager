(function () {
  "use strict";

  console.log("Indian Lunch Order: Manager-Navigation-Fix geladen");

  function showManagerView() {
    var orderView = document.getElementById("orderView");
    var managerView = document.getElementById("managerView");
    var loginCard = document.getElementById("loginCard");
    var managerApp = document.getElementById("managerApp");

    if (!orderView || !managerView) {
      console.error("Manager-Navigation: orderView oder managerView fehlt.");
      return;
    }

    orderView.classList.add("hidden");
    managerView.classList.remove("hidden");

    if (loginCard && managerApp) {
      var hasSession = false;

      if (window.ILO_DB && window.ILO_DB.configured && typeof window.ILO_DB.getSession === "function") {
        window.ILO_DB.getSession()
          .then(function (session) {
            hasSession = Boolean(session);
            loginCard.classList.toggle("hidden", hasSession);
            managerApp.classList.toggle("hidden", !hasSession);
          })
          .catch(function (error) {
            console.error("Manager-Session konnte nicht geprüft werden:", error);
            loginCard.classList.remove("hidden");
            managerApp.classList.add("hidden");
            var message = document.getElementById("loginMessage");
            if (message) {
              message.className = "error";
              message.textContent = "Manager-Anmeldung konnte nicht initialisiert werden: " + error.message;
            }
          });
      } else {
        loginCard.classList.remove("hidden");
        managerApp.classList.add("hidden");
      }
    }
  }

  function showOrderView() {
    var orderView = document.getElementById("orderView");
    var managerView = document.getElementById("managerView");

    if (!orderView || !managerView) return;

    managerView.classList.add("hidden");
    orderView.classList.remove("hidden");
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-view]");
    if (!button) return;

    if (button.dataset.view === "manager") {
      event.preventDefault();
      showManagerView();
    }

    if (button.dataset.view === "order") {
      event.preventDefault();
      showOrderView();
    }
  }, true);

  window.ILO_NAVIGATION = {
    showManagerView: showManagerView,
    showOrderView: showOrderView
  };
})();
