console.log("Indian Lunch Order: app.js wird geladen");

document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  console.log("Indian Lunch Order: DOM vollständig geladen");

  var $ = function (id) { return document.getElementById(id); };
  var currentRound = null;
  var currentMenu = [];
  var cart = [];

  function euro(value) {
    return Number(value || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character];
    });
  }

  function showMessage(text, type) {
    $("message").className = type || "";
    $("message").textContent = text || "";
  }

  function showCartMessage(text, type) {
    $("cartMessage").className = type || "";
    $("cartMessage").textContent = text || "";
  }

  function databaseReady() {
    if (!window.ILO_DB || !window.ILO_DB.configured) {
      $("setup").classList.remove("hidden");
      showMessage("Supabase ist nicht vollständig konfiguriert.", "error");
      return false;
    }
    $("setup").classList.add("hidden");
    return true;
  }

  function switchView(name) {
    $("orderView").classList.toggle("hidden", name !== "order");
    $("managerView").classList.toggle("hidden", name !== "manager");
    if (name === "manager") initializeManager();
  }

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () { switchView(button.dataset.view); });
  });

  async function loadRound() {
    if (!databaseReady()) return;
    var code = $("roundCode").value.trim();
    if (!code) return showMessage("Bitte einen Bestellcode eingeben.", "error");
    var button = $("loadRoundButton");
    button.disabled = true;
    button.textContent = "Wird geladen …";
    try {
      currentRound = await ILO_DB.activeRound(code);
      if (!currentRound) {
        currentMenu = [];
        renderMenu();
        return showMessage("Keine offene Bestellrunde für diesen Code gefunden.", "error");
      }
      currentMenu = await ILO_DB.loadMenu(currentRound.id);
      $("roundBadge").textContent = "Bestellrunde offen";
      $("roundInfo").textContent = [currentRound.restaurant_name, currentRound.restaurant_phone].filter(Boolean).join(" · ");
      $("deadline").textContent = new Intl.DateTimeFormat("de-DE",{
            timeZone: "Europe/Berlin",
            dateStyle: "short",
            timeStyle: "short"
        }
    ).format(
        new Date(currentRound.deadline)
    );
      renderCategories();
      renderMenu();
      showMessage(currentMenu.length + " Gerichte wurden geladen.", "success");
      await loadMyStoredOrder();
    } catch (error) {
      console.error(error);
      showMessage("Bestellrunde konnte nicht geladen werden: " + error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Speisekarte laden";
    }
  }

  $("loadRoundButton").addEventListener("click", loadRound);
  $("roundCode").addEventListener("keydown", function (event) {
    if (event.key === "Enter") { event.preventDefault(); loadRound(); }
  });
  $("search").addEventListener("input", renderMenu);
  $("category").addEventListener("change", renderMenu);

  function renderCategories() {
    var categories = Array.from(new Set(currentMenu.map(function (item) { return item.category; }).filter(Boolean)));
    $("category").innerHTML = '<option value="">Alle Kategorien</option>' + categories.map(function (category) {
      return '<option value="' + esc(category) + '">' + esc(category) + '</option>';
    }).join("");
  }

  function renderMenu() {
    if (!currentMenu.length) {
      $("menu").innerHTML = '<div class="card panel"><p>Noch keine Speisekarte geladen.</p></div>';
      return;
    }
    var query = $("search").value.toLowerCase().trim();
    var category = $("category").value;
    var filtered = currentMenu.filter(function (item) {
      var text = [item.item_number, item.name, item.description, item.category].join(" ").toLowerCase();
      return (!category || item.category === category) && (!query || text.indexOf(query) >= 0);
    });
    $("menu").innerHTML = filtered.map(function (item) {
      return '<article class="card dish">' +
        '<div class="top"><span class="tag">' + esc(item.item_number) + '</span><b>' + euro(item.price) + '</b></div>' +
        '<h3>' + esc(item.name) + '</h3><p>' + esc(item.description) + '</p>' +
        '<div><span class="tag">' + esc(item.category) + '</span></div>' +
        '<div class="dish-controls"><input id="note-' + item.id + '" type="text" placeholder="Sonderwunsch, optional">' +
        '<button type="button" class="primary add-item-button" data-item-id="' + item.id + '">Hinzufügen</button></div></article>';
    }).join("");
    document.querySelectorAll(".add-item-button").forEach(function (button) {
      button.addEventListener("click", function () { addItem(button.dataset.itemId); });
    });
  }

  function addItem(itemId) {
    var menuItem = currentMenu.find(function (item) { return item.id === itemId; });
    if (!menuItem) return;
    var note = $("note-" + itemId).value.trim();
    var key = itemId + "|" + note;
    var existing = cart.find(function (item) { return item.key === key; });
    if (existing) existing.quantity += 1;
    else cart.push({ key: key, menu_item_id: itemId, item_number: menuItem.item_number, name: menuItem.name, unit_price: Number(menuItem.price), quantity: 1, note: note });
    renderCart();
    showMessage(menuItem.name + " wurde hinzugefügt.", "success");
  }

  function renderCart() {
    var total = cart.reduce(function (sum, item) { return sum + item.unit_price * item.quantity; }, 0);
    var count = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
    $("cartCount").textContent = String(count);
    $("cartTotal").textContent = euro(total);
    $("dialogTotal").textContent = euro(total);
    if (!cart.length) return $("cartLines").innerHTML = "<p>Der Warenkorb ist leer.</p>";
    $("cartLines").innerHTML = cart.map(function (item, index) {
      return '<div class="row"><div><b>' + item.quantity + ' × ' + esc(item.name) + '</b>' +
        (item.note ? '<div class="muted">Sonderwunsch: ' + esc(item.note) + '</div>' : '') +
        '</div><div><b>' + euro(item.quantity * item.unit_price) + '</b><br>' +
        '<button type="button" class="remove-item" data-index="' + index + '">Entfernen</button></div></div>';
    }).join("");
    document.querySelectorAll(".remove-item").forEach(function (button) {
      button.addEventListener("click", function () { cart.splice(Number(button.dataset.index), 1); renderCart(); });
    });
  }

  $("cartButton").addEventListener("click", function () { showCartMessage(""); $("cartDialog").showModal(); });

  function createToken() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var values = new Uint8Array(16); crypto.getRandomValues(values);
    return Array.from(values).map(function (value) { return value.toString(16).padStart(2, "0"); }).join("");
  }

  function myOrderContainer() {
    var container = $("myOrderContainer");
    if (container) return container;
    container = document.createElement("section");
    container.id = "myOrderContainer";
    container.className = "card panel hidden";
    container.style.marginTop = "18px";
    $("message").insertAdjacentElement("afterend", container);
    return container;
  }

  function renderMyOrder(order) {
    var container = myOrderContainer();
    if (!order) { container.classList.add("hidden"); container.innerHTML = ""; return; }
    var items = order.items || [];
    container.innerHTML = '<div class="actions"><div><span class="badge">Bestellung gespeichert</span><h2>Deine aktuelle Bestellung</h2>' +
      '<p class="muted">Bestellung von ' + esc(order.participant_name) + '</p></div><b>' + euro(order.total_amount) + '</b></div>' +
      items.map(function (item) {
        return '<div class="row"><div><b>' + item.quantity + ' × ' + esc(item.item_number) + ' ' + esc(item.item_name) + '</b>' +
          (item.note ? '<div class="muted">Sonderwunsch: ' + esc(item.note) + '</div>' : '') +
          '</div><b>' + euro(item.quantity * item.unit_price) + '</b></div>';
      }).join("") + '<div class="total"><b>Gesamt</b><b>' + euro(order.total_amount) + '</b></div>' +
      '<p class="' + (order.paid ? 'success' : 'muted') + '">' + (order.paid ? 'Zahlung wurde bestätigt.' : 'Zahlung ist noch offen.') + '</p>';
    container.classList.remove("hidden");
  }

  async function loadMyStoredOrder() {
    if (!currentRound) return;
    var raw = localStorage.getItem("ilo_edit_" + currentRound.id);
    if (!raw) return renderMyOrder(null);
    try {
      var stored = JSON.parse(raw);
      renderMyOrder(await ILO_DB.getMyOrder(stored.orderId, stored.editToken));
    } catch (error) { console.error(error); renderMyOrder(null); }
  }

  $("submitOrder").addEventListener("click", async function () {
    if (!currentRound) return showCartMessage("Bitte zuerst die Bestellrunde laden.", "error");
    var name = $("participantName").value.trim();
    if (!name) return showCartMessage("Bitte deinen Namen eingeben.", "error");
    if (!cart.length) return showCartMessage("Der Warenkorb ist leer.", "error");
    var token = createToken();
    var button = $("submitOrder");
    button.disabled = true; button.textContent = "Wird gespeichert …";
    try {
      var orderId = await ILO_DB.submitOrder({
        p_round_code: $("roundCode").value.trim(),
        p_participant_name: name,
        p_edit_token: token,
        p_note: $("orderNote").value.trim(),
        p_items: cart.map(function (item) {
          return { menu_item_id: item.menu_item_id, quantity: item.quantity, spice: "", side: "", note: item.note || "" };
        })
      });
      localStorage.setItem("ilo_edit_" + currentRound.id, JSON.stringify({ orderId: orderId, editToken: token, name: name }));
      renderMyOrder(await ILO_DB.getMyOrder(orderId, token));
      cart = []; renderCart();
      showCartMessage("Die Bestellung wurde erfolgreich gespeichert.", "success");
      setTimeout(function () { $("cartDialog").close(); showMessage("Bestellung wurde erfolgreich gespeichert.", "success"); }, 900);
    } catch (error) {
      console.error(error); showCartMessage("Bestellung fehlgeschlagen: " + error.message, "error");
    } finally { button.disabled = false; button.textContent = "Bestellung absenden"; }
  });

  async function initializeManager() {
    if (!databaseReady()) return;
    try {
      var session = await ILO_DB.getSession();
      $("loginCard").classList.toggle("hidden", Boolean(session));
      $("managerApp").classList.toggle("hidden", !session);
      if (session) await loadManagerData();
    } catch (error) { $("loginMessage").textContent = error.message; }
  }

  $("loginButton").addEventListener("click", async function () {
    try { await ILO_DB.login($("managerEmail").value.trim(), $("managerPassword").value); await initializeManager(); }
    catch (error) { $("loginMessage").className = "error"; $("loginMessage").textContent = "Anmeldung fehlgeschlagen: " + error.message; }
  });
  $("logoutButton").addEventListener("click", async function () { await ILO_DB.logout(); await initializeManager(); });
  document.querySelectorAll("[data-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (tab) { tab.classList.add("hidden"); });
      $(button.dataset.tab + "Tab").classList.remove("hidden");
    });
  });

  async function loadManagerData() {
    try {
      var round = await ILO_DB.getLatestRound();
      if (!round) return $("ordersList").innerHTML = "<p>Keine Bestellrunde vorhanden.</p>";
      var orders = await ILO_DB.getOrders(round.id);
      var allItems = orders.flatMap(function (order) { return (order.order_items || []).map(function (item) { return Object.assign({}, item, { participant_name: order.participant_name }); }); });
      var total = orders.reduce(function (sum, order) { return sum + Number(order.total_amount || 0); }, 0);
      var positionCount = allItems.reduce(function (sum, item) { return sum + Number(item.quantity); }, 0);
      var paidOrders = orders.filter(function (order) { return order.paid; });
      var openOrders = orders.filter(function (order) { return !order.paid; });
      var openAmount = openOrders.reduce(function (sum, order) { return sum + Number(order.total_amount || 0); }, 0);
      $("managerStats").innerHTML = '<div class="stat">Bestellungen<b>' + orders.length + '</b></div>' +
        '<div class="stat">Bezahlt<b>' + paidOrders.length + '</b></div><div class="stat">Zahlung offen<b>' + openOrders.length + '</b></div>' +
        '<div class="stat">Offener Betrag<b>' + euro(openAmount) + '</b></div><div class="stat">Positionen<b>' + positionCount + '</b></div>' +
        '<div class="stat">Gesamtsumme<b>' + euro(total) + '</b></div>';
      $("ordersList").innerHTML = orders.length ? orders.map(function (order) {
        var descriptions = (order.order_items || []).map(function (item) { return item.quantity + ' × ' + esc(item.item_name); }).join(", ");
        return '<div class="row"><div><b>' + esc(order.participant_name) + '</b><div class="muted">' + descriptions + '</div></div>' +
          '<div><b>' + euro(order.total_amount) + '</b><label style="display:flex;gap:7px;margin-top:7px;align-items:center">' +
          '<input type="checkbox" class="paid-checkbox" data-order-id="' + order.id + '" ' + (order.paid ? 'checked' : '') + '>' +
          '<span>' + (order.paid ? 'Bezahlt' : 'Zahlung offen') + '</span></label></div></div>';
      }).join("") : "<p>Noch keine Bestellungen vorhanden.</p>";
      document.querySelectorAll(".paid-checkbox").forEach(function (checkbox) {
        checkbox.addEventListener("change", async function () {
          var paid = checkbox.checked; checkbox.disabled = true;
          try { await ILO_DB.setOrderPaid(checkbox.dataset.orderId, paid); await loadManagerData(); }
          catch (error) { checkbox.checked = !paid; alert("Zahlungsstatus konnte nicht gespeichert werden: " + error.message); }
          finally { checkbox.disabled = false; }
        });
      });
      var grouped = {};
      allItems.forEach(function (item) {
        var key = item.menu_item_id + "|" + (item.note || "");
        if (!grouped[key]) grouped[key] = Object.assign({}, item, { quantity: 0 });
        grouped[key].quantity += Number(item.quantity);
      });
      var groupedList = Object.values(grouped);
      $("phoneHeader").innerHTML = '<p><b>' + esc(round.restaurant_name) + '</b> · ' + esc(round.restaurant_phone) + ' · Gesamt ' + euro(total) + '</p>';
      $("phoneList").innerHTML = groupedList.length ? groupedList.map(function (item) {
        return '<label class="phone-line"><input type="checkbox"><span><b>' + item.quantity + ' × ' + esc(item.item_number) + ' ' + esc(item.item_name) + '</b>' +
          (item.note ? '<br><span class="muted">Sonderwunsch: ' + esc(item.note) + '</span>' : '') + '</span></label>';
      }).join("") : "<p>Noch keine Bestellpositionen vorhanden.</p>";
      window.phoneOrderText = [round.restaurant_name, round.restaurant_phone, ""].concat(groupedList.map(function (item) {
        return item.quantity + " x " + item.item_number + " " + item.item_name + (item.note ? " | Sonderwunsch: " + item.note : "");
      }), ["", "Gesamt: " + euro(total)]).join("\n");
    } catch (error) { console.error(error); $("ordersList").innerHTML = '<p class="error">' + esc(error.message) + '</p>'; }
  }

  $("copyOrder").addEventListener("click", async function () { await navigator.clipboard.writeText(window.phoneOrderText || ""); alert("Bestellung wurde kopiert."); });
  $("exportCsv").addEventListener("click", function () {
    var blob = new Blob(["\ufeff" + (window.phoneOrderText || "")], { type: "text/csv;charset=utf-8" });
    var link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "bestellung.csv"; link.click(); URL.revokeObjectURL(link.href);
  });
  $("saveRound").addEventListener("click", async function () {
    try {
      await ILO_DB.saveRound({ restaurant_name: $("restaurantName").value.trim(), restaurant_phone: $("restaurantPhone").value.trim(), access_code: $("newRoundCode").value.trim(), deadline: $("newDeadline").value, delivery_time: $("deliveryTime").value || null, status: $("roundStatus").value });
      $("roundSaveMessage").className = "success"; $("roundSaveMessage").textContent = "Bestellrunde wurde gespeichert.";
      await loadManagerData();
    } catch (error) { $("roundSaveMessage").className = "error"; $("roundSaveMessage").textContent = error.message; }
  });

  renderCart();
  renderMenu();
  databaseReady();
  console.log("Indian Lunch Order: Benutzeroberfläche initialisiert");
});
