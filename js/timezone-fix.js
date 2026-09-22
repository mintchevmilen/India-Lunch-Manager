(function () {
  "use strict";

  var ZONE = "Europe/Berlin";

  function element(id) {
    return document.getElementById(id);
  }

  function zonedParts(timestamp) {
    var formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    var result = {};
    formatter.formatToParts(new Date(timestamp)).forEach(function (part) {
      if (part.type !== "literal") result[part.type] = part.value;
    });
    return result;
  }

  function berlinLocalToUtcIso(localValue) {
    if (!localValue) return null;

    var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
    if (!match) throw new Error("Ungültiges Datum. Erwartet wird JJJJ-MM-TT HH:MM.");

    var desiredUtc = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      0
    );

    var guess = desiredUtc;
    for (var i = 0; i < 2; i += 1) {
      var displayed = zonedParts(guess);
      var displayedAsUtc = Date.UTC(
        Number(displayed.year),
        Number(displayed.month) - 1,
        Number(displayed.day),
        Number(displayed.hour),
        Number(displayed.minute),
        Number(displayed.second)
      );
      guess += desiredUtc - displayedAsUtc;
    }

    return new Date(guess).toISOString();
  }

  function berlinDisplay(timestamp) {
    if (!timestamp) return "–";
    return new Intl.DateTimeFormat("de-DE", {
      timeZone: ZONE,
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(timestamp));
  }

  window.ILO_TIME = {
    timeZone: ZONE,
    berlinLocalToUtcIso: berlinLocalToUtcIso,
    berlinDisplay: berlinDisplay
  };

  document.addEventListener("DOMContentLoaded", function () {
    var oldButton = element("saveRound");
    if (!oldButton) {
      console.warn("timezone-fix.js: saveRound wurde nicht gefunden.");
      return;
    }

    var newButton = oldButton.cloneNode(true);
    oldButton.parentNode.replaceChild(newButton, oldButton);

    newButton.addEventListener("click", async function () {
      var message = element("roundSaveMessage");
      var deadlineValue = element("newDeadline").value;
      var deliveryValue = element("deliveryTime").value;

      if (!element("restaurantName").value.trim() ||
          !element("newRoundCode").value.trim() ||
          !deadlineValue) {
        if (message) {
          message.className = "error";
          message.textContent = "Restaurant, Bestellcode und Bestellfrist sind erforderlich.";
        }
        return;
      }

      newButton.disabled = true;
      newButton.textContent = "Wird gespeichert …";

      try {
        var deadlineIso = berlinLocalToUtcIso(deadlineValue);
        var deliveryIso = deliveryValue ? berlinLocalToUtcIso(deliveryValue) : null;

        await window.ILO_DB.saveRound({
          restaurant_name: element("restaurantName").value.trim(),
          restaurant_phone: element("restaurantPhone").value.trim(),
          access_code: element("newRoundCode").value.trim(),
          deadline: deadlineIso,
          delivery_time: deliveryIso,
          status: element("roundStatus").value
        });

        if (message) {
          message.className = "success";
          message.textContent = "Bestellrunde gespeichert. Bestellschluss: " + berlinDisplay(deadlineIso) + " Uhr (Berlin).";
        }
      } catch (error) {
        console.error("Bestellrunde konnte nicht gespeichert werden", error);
        if (message) {
          message.className = "error";
          message.textContent = "Bestellrunde konnte nicht gespeichert werden: " + error.message;
        }
      } finally {
        newButton.disabled = false;
        newButton.textContent = "Bestellrunde speichern";
      }
    });

    console.log("Indian Lunch Order: Zeitzone Europe/Berlin aktiviert");
  });
})();
