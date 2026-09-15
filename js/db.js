const config = window.APP_CONFIG || {};

const isConfigured =
    Boolean(config.supabaseUrl) &&
    Boolean(config.supabaseAnonKey) &&
    !config.supabaseUrl.includes("YOUR_PROJECT") &&
    !config.supabaseAnonKey.includes("YOUR_PUBLIC");

let supabaseClient = null;

if (isConfigured) {
    supabaseClient = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey
    );
}

function createDetailedError(error, context) {
    console.error(context, error);

    const details = [
        error?.message,
        error?.hint,
        error?.details
    ]
        .filter(Boolean)
        .join(" | ");

    const detailedError = new Error(
        details || "Unbekannter Supabase-Fehler"
    );

    detailedError.code = error?.code;
    detailedError.status = error?.status;

    return detailedError;
}

window.ILO_DB = {
    configured: isConfigured,

    async activeRound(code) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const normalizedCode = String(code || "")
            .trim();

        const { data, error } =
            await supabaseClient.rpc(
                "get_active_round",
                {
                    p_code: normalizedCode
                }
            );

        if (error) {
            throw createDetailedError(
                error,
                "get_active_round ist fehlgeschlagen"
            );
        }

        if (!Array.isArray(data)) {
            return null;
        }

        return data[0] || null;
    },

    async menu(roundId) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const { data, error } =
            await supabaseClient
                .from("menu_items")
                .select("*")
                .eq("round_id", roundId)
                .eq("available", true)
                .order("category")
                .order("item_number");

        if (error) {
            throw createDetailedError(
                error,
                "Speisekarte konnte nicht geladen werden"
            );
        }

        return data || [];
    },

    async submit(payload) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        console.log(
            "RPC submit_lunch_order wird aufgerufen:",
            payload
        );

        const { data, error } =
            await supabaseClient.rpc(
                "submit_lunch_order",
                payload
            );

        if (error) {
            throw createDetailedError(
                error,
                "submit_lunch_order ist fehlgeschlagen"
            );
        }

        console.log(
            "Antwort von submit_lunch_order:",
            data
        );

        return data;
    },

    async login(email, password) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const { data, error } =
            await supabaseClient.auth
                .signInWithPassword({
                    email,
                    password
                });

        if (error) {
            throw createDetailedError(
                error,
                "Manager-Anmeldung ist fehlgeschlagen"
            );
        }

        return data;
    },

    async logout() {
        if (!supabaseClient) {
            return;
        }

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw createDetailedError(
                error,
                "Abmeldung ist fehlgeschlagen"
            );
        }
    },

    async session() {
        if (!supabaseClient) {
            return null;
        }

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw createDetailedError(
                error,
                "Session konnte nicht geladen werden"
            );
        }

        return data.session;
    },

    async managerRound() {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const { data, error } =
            await supabaseClient
                .from("order_rounds")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .single();

        if (error) {
            throw createDetailedError(
                error,
                "Bestellrunde konnte nicht geladen werden"
            );
        }

        return data;
    },

    async managerOrders(roundId) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const { data, error } =
            await supabaseClient
                .from("orders")
                .select(`
                    *,
                    order_items (*)
                `)
                .eq("round_id", roundId)
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw createDetailedError(
                error,
                "Bestellungen konnten nicht geladen werden"
            );
        }

        return data || [];
    },

    async saveRound(roundData) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const { data, error } =
            await supabaseClient
                .from("order_rounds")
                .upsert(roundData)
                .select()
                .single();

        if (error) {
            throw createDetailedError(
                error,
                "Bestellrunde konnte nicht gespeichert werden"
            );
        }

        return data;
    }
};