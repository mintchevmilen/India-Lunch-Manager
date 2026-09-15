console.log("Indian Lunch Order: db.js wird geladen");

const appConfig = window.APP_CONFIG || {};

const supabaseIsConfigured =
    Boolean(appConfig.supabaseUrl) &&
    Boolean(appConfig.supabaseAnonKey) &&
    !appConfig.supabaseUrl.includes("DEIN-PROJEKT") &&
    !appConfig.supabaseUrl.includes("YOUR_PROJECT") &&
    !appConfig.supabaseAnonKey.includes("DEIN_ECHTER_KEY") &&
    !appConfig.supabaseAnonKey.includes("YOUR_PUBLIC");

let supabaseClient = null;

if (!window.supabase) {
    console.error(
        "Die Supabase-Bibliothek wurde nicht geladen."
    );
} else if (supabaseIsConfigured) {
    supabaseClient = window.supabase.createClient(
        appConfig.supabaseUrl,
        appConfig.supabaseAnonKey
    );

    console.log(
        "Indian Lunch Order: Supabase Client erstellt"
    );
}

function buildSupabaseError(error, context) {
    console.error(context, error);

    const errorParts = [
        error?.message,
        error?.hint,
        error?.details
    ].filter(Boolean);

    const result = new Error(
        errorParts.join(" | ") ||
        "Unbekannter Supabase-Fehler"
    );

    result.code = error?.code;
    result.status = error?.status;

    return result;
}

window.ILO_DB = {
    configured: supabaseIsConfigured,

    async activeRound(code) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const normalizedCode =
            String(code || "").trim();

        const { data, error } =
            await supabaseClient.rpc(
                "get_active_round",
                {
                    p_code: normalizedCode
                }
            );

        if (error) {
            throw buildSupabaseError(
                error,
                "get_active_round ist fehlgeschlagen"
            );
        }

        if (!Array.isArray(data)) {
            return null;
        }

        return data[0] || null;
    },

    async loadMenu(roundId) {
        if (!supabaseClient) {
            throw new Error(
                "Supabase ist nicht konfiguriert."
            );
        }

        const { data, error } =
            await supabaseClient
                .from("menu_items")
                .select("*")
                .eq("round_id",*roundId)
                .eq("avai*able", true)
                .orde*("category")
                .orde*("item_number");

        if (erro*) {
            throw buildSupabas*Error(
                error,
    *           "Speisekarte konnte nic*t geladen werden"
            );
 *      }

        return data || []*
    },

    async submitOrder(pay*oad) {
        if (!supabaseClient* {
            throw new Error(
  *             "Supabase ist nicht k*nfiguriert."
            );
      * }

        console.log(
         *  "submit_lunch_order Payload:",
 *          payload
        );

    *   const { data, error } =
       *    await supabaseClient.rpc(
    *           "submit_lunch_order",
 *              payload
            *;

        if (error) {
          * throw buildSupabaseError(
       *        error,
                "su*mit_lunch_order ist fehlgeschlagen*
            );
        }

       *console.log(
            "submit_l*nch_order erfolgreich:",
         *  data
        );

        return *ata;
    },

    async login(email* password) {
        if (!supabase*lient) {
            throw new Err*r(
                "Supabase ist n*cht konfiguriert."
            );
*       }

        const { data, er*or } =
            await supabaseC*ient.auth
                .signInW*thPassword({
                    e*ail,
                    password
*               });

        if (er*or) {
            throw buildSupab*seError(
                error,
  *             "Manager-Anmeldung fe*lgeschlagen"
            );
      * }

        return data;
    },

 *  async logout() {
        if (!su*abaseClient) {
            return;*        }

        const { error }*=
            await supabaseClient*auth.signOut();

        if (error* {
            throw buildSupabase*rror(
                error,
     *          "Abmeldung fehlgeschlage*"
            );
        }
    },
*    async getSession() {
        i* (!supabaseClient) {
            r*turn null;
        }

        cons* { data, error } =
            awa*t supabaseClient.auth.getSession();

        if (error) {
            throw buildSupabaseError(
                error,
                "Session konnte nicht geladen werden"
            );
        }

        return data.session;
    },

    async getLatestRound() {
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
                .maybeSingle();

        if (error) {
            throw buildSupabaseError(
                error,
                "Bestellrunde konnte nicht geladen werden"
            );
        }

        return data;
    },

    async getOrders(roundId) {
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
            throw buildSupabaseError(
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
                .insert(roundData)
                .select()
                .single();

        if (error) {
            throw buildSupabaseError(
                error,
                "Bestellrunde konnte nicht gespeichert werden"
            );
        }

        return data;
    }
};

console.log(
    "Indian Lunch Order: ILO_DB verfügbar",
    Boolean(window.ILO_DB)
);
