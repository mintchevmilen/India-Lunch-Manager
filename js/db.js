(function () {
  "use strict";

  console.log("Indian Lunch Order: db.js gestartet");

  const config = window.APP_CONFIG || {};
  const hasUrl = typeof config.supabaseUrl === "string" && config.supabaseUrl.startsWith("https://");
  const hasKey = typeof config.supabaseAnonKey === "string" && config.supabaseAnonKey.length > 20;
  const libraryAvailable = Boolean(window.supabase && typeof window.supabase.createClient === "function");
  const configured = hasUrl && hasKey && libraryAvailable;
  let client = null;

  if (configured) {
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    console.log("Indian Lunch Order: Supabase-Client erstellt");
  } else {
    console.error("Supabase nicht bereit", { hasUrl, hasKey, libraryAvailable });
  }

  function ensureClient() {
    if (!libraryAvailable) {
      throw new Error("Die Supabase-Bibliothek wurde nicht geladen.");
    }
    if (!hasUrl || !hasKey) {
      throw new Error("Supabase-URL oder Publishable Key in js/config.js fehlt oder ist ungültig.");
    }
    if (!client) {
      throw new Error("Der Supabase-Client konnte nicht erstellt werden.");
    }
    return client;
  }

  function detailedError(error, context) {
    console.error(context, error);
    const message = [error && error.message, error && error.hint, error && error.details]
      .filter(Boolean)
      .join(" | ") || context;
    const result = new Error(message);
    result.code = error && error.code;
    return result;
  }

  window.ILO_DB = {
    configured,

    async activeRound(code) {
      const db = ensureClient();
      const response = await db.rpc("get_active_round", { p_code: String(code || "").trim() });
      if (response.error) throw detailedError(response.error, "Bestellrunde konnte nicht geladen werden");
      return Array.isArray(response.data) ? (response.data[0] || null) : null;
    },

    async loadMenu(roundId) {
      const db = ensureClient();
      const response = await db
        .from("menu_items")
        .select("*")
        .eq("round_id", roundId)
        .eq("available", true)
        .order("category")
        .order("item_number");
      if (response.error) throw detailedError(response.error, "Speisekarte konnte nicht geladen werden");
      return response.data || [];
    },

    async submitOrder(payload) {
      const db = ensureClient();
      const response = await db.rpc("submit_lunch_order", payload);
      if (response.error) throw detailedError(response.error, "Bestellung konnte nicht gespeichert werden");
      return response.data;
    },

    async login(email, password) {
      const db = ensureClient();
      const response = await db.auth.signInWithPassword({ email, password });
      if (response.error) throw detailedError(response.error, "Anmeldung fehlgeschlagen");
      return response.data;
    },

    async logout() {
      const db = ensureClient();
      const response = await db.auth.signOut();
      if (response.error) throw detailedError(response.error, "Abmeldung fehlgeschlagen");
    },

    async getSession() {
      const db = ensureClient();
      const response = await db.auth.getSession();
      if (response.error) throw detailedError(response.error, "Session konnte nicht geladen werden");
      return response.data.session;
    },

async getLatestRound() {
    const db = ensureClient();

    const response = await db
        .from("order_rounds")
        .select("*")
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle();

    if (response.error) {
        throw detailedError(
            response.error,
            "Bestellrunde konnte nicht geladen werden"
        );
    }

    return response.data;
},

async getOrders(roundId) {
    const db = ensureClient();

    const ordersResponse = await db
        .from("orders")
        .select("*")
        .eq("round_id", roundId)
        .order("created_at", {
            ascending: true
        });

    if (ordersResponse.error) {
        throw detailedError(
            ordersResponse.error,
            "Bestellungen konnten nicht geladen werden"
        );
    }

    const orders = ordersResponse.data || [];

    if (orders.length === 0) {
        return [];
    }

    const orderIds = orders.map(function (order) {
        return order.id;
    });

    const itemsResponse = await db
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("id", {
            ascending: true
        });

    if (itemsResponse.error) {
        throw detailedError(
            itemsResponse.error,
            "Bestellpositionen konnten nicht geladen werden"
        );
    }

    const orderItems = itemsResponse.data || [];

    return orders.map(function (order) {
        return {
            ...order,
            order_items: orderItems.filter(
                function (item) {
                    return item.order_id === order.id;
                }
            )
        };
    });
},

    async saveRound(roundData) {
      const db = ensureClient();
      const response = await db.from("order_rounds").insert(roundData).select().single();
      if (response.error) throw detailedError(response.error, "Bestellrunde konnte nicht gespeichert werden");
      return response.data;
    }
  };

  console.log("Indian Lunch Order: db.js fertig, ILO_DB verfügbar", Boolean(window.ILO_DB));
})();
