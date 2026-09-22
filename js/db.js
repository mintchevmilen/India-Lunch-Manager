(function () {
  "use strict";

  console.log("Indian Lunch Order: db.js gestartet");

  var config = window.APP_CONFIG || {};
  var hasUrl = typeof config.supabaseUrl === "string" && config.supabaseUrl.indexOf("https://") === 0;
  var hasKey = typeof config.supabaseAnonKey === "string" && config.supabaseAnonKey.length > 20;
  var libraryAvailable = Boolean(window.supabase && typeof window.supabase.createClient === "function");
  var configured = hasUrl && hasKey && libraryAvailable;
  var client = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

  if (configured) {
    console.log("Indian Lunch Order: Supabase-Client erstellt");
  } else {
    console.error("Supabase nicht bereit", {
      hasUrl: hasUrl,
      hasKey: hasKey,
      libraryAvailable: libraryAvailable
    });
  }

  function ensureClient() {
    if (!libraryAvailable) throw new Error("Die Supabase-Bibliothek wurde nicht geladen.");
    if (!hasUrl || !hasKey) throw new Error("Supabase-URL oder Publishable Key in js/config.js fehlt oder ist ungueltig.");
    if (!client) throw new Error("Der Supabase-Client konnte nicht erstellt werden.");
    return client;
  }

  function detailedError(error, context) {
    console.error(context, error);
    var parts = [];
    if (error && error.message) parts.push(error.message);
    if (error && error.hint) parts.push(error.hint);
    if (error && error.details) parts.push(error.details);
    var result = new Error(parts.join(" | ") || context);
    result.code = error && error.code;
    return result;
  }

  window.ILO_DB = {
    configured: configured,

    activeRound: async function (code) {
      var response = await ensureClient().rpc("get_active_round", {
        p_code: String(code || "").trim()
      });
      if (response.error) throw detailedError(response.error, "Bestellrunde konnte nicht geladen werden");
      return Array.isArray(response.data) ? (response.data[0] || null) : null;
    },

    loadMenu: async function (roundId) {
      var response = await ensureClient()
        .from("menu_items")
        .select("*")
        .eq("round_id", roundId)
        .eq("available", true)
        .order("category")
        .order("item_number");
      if (response.error) throw detailedError(response.error, "Speisekarte konnte nicht geladen werden");
      return response.data || [];
    },

    submitOrder: async function (payload) {
      var response = await ensureClient().rpc("submit_lunch_order", payload);
      if (response.error) throw detailedError(response.error, "Bestellung konnte nicht gespeichert werden");
      return response.data;
    },

    getMyOrder: async function (orderId, editToken) {
      var response = await ensureClient().rpc("get_my_lunch_order", {
        p_order_id: orderId,
        p_edit_token: editToken
      });
      if (response.error) throw detailedError(response.error, "Eigene Bestellung konnte nicht geladen werden");
      return response.data;
    },

    login: async function (email, password) {
      var response = await ensureClient().auth.signInWithPassword({
        email: email,
        password: password
      });
      if (response.error) throw detailedError(response.error, "Anmeldung fehlgeschlagen");
      return response.data;
    },

    logout: async function () {
      var response = await ensureClient().auth.signOut();
      if (response.error) throw detailedError(response.error, "Abmeldung fehlgeschlagen");
    },

    getSession: async function () {
      var response = await ensureClient().auth.getSession();
      if (response.error) throw detailedError(response.error, "Session konnte nicht geladen werden");
      return response.data.session;
    },

    getLatestRound: async function () {
      var response = await ensureClient()
        .from("order_rounds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (response.error) throw detailedError(response.error, "Bestellrunde konnte nicht geladen werden");
      return response.data;
    },

    getOrders: async function (roundId) {
      var db = ensureClient();
      var ordersResponse = await db
        .from("orders")
        .select("*")
        .eq("round_id", roundId)
        .order("created_at", { ascending: true });

      if (ordersResponse.error) throw detailedError(ordersResponse.error, "Bestellungen konnten nicht geladen werden");

      var orders = ordersResponse.data || [];
      if (!orders.length) return [];

      var orderIds = orders.map(function (order) { return order.id; });
      var itemsResponse = await db
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("id", { ascending: true });

      if (itemsResponse.error) throw detailedError(itemsResponse.error, "Bestellpositionen konnten nicht geladen werden");

      var items = itemsResponse.data || [];
      return orders.map(function (order) {
        var copy = Object.assign({}, order);
        copy.order_items = items.filter(function (item) { return item.order_id === order.id; });
        return copy;
      });
    },

    setOrderPaid: async function (orderId, paid) {
      var response = await ensureClient().rpc("set_order_paid", {
        p_order_id: orderId,
        p_paid: paid
      });
      if (response.error) throw detailedError(response.error, "Zahlungsstatus konnte nicht gespeichert werden");
    },

    saveRound: async function (roundData) {
      var response = await ensureClient()
        .from("order_rounds")
        .insert(roundData)
        .select()
        .single();
      if (response.error) throw detailedError(response.error, "Bestellrunde konnte nicht gespeichert werden");
      return response.data;
    }
  };

  console.log("Indian Lunch Order: db.js fertig, ILO_DB verfuegbar", Boolean(window.ILO_DB));
})();
