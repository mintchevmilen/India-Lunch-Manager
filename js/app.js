const getElement = id => document.getElementById(id);

const euro = value =>
    Number(value || 0).toLocaleString(
        "de-DE",
        {
            style: "currency",
            currency: "EUR"
        }
    );

let currentRound = null;
let menuItems = [];
let cart = [];

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"]/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;"
        })[character]
    );
}

function showMessage(text, type = "") {
    const messageElement = getElement("message");

    messageElement.className = type;
    messageElement.textContent = text;
}

function showCartMessage(text, type = "") {
    const cartMessage = getElement("cartMessage");

    cartMessage.className = type;
    cartMessage.textContent = text;
}

function changeView(viewName) {
    getElement("orderView").classList.toggle(
        "hidden",
        viewName !== "order"
    );

    getElement("managerView").classList.toggle(
        "hidden",
        viewName !== "manager"
    );

    if (viewName === "manager") {
        initializeManager();
    }
}

document
    .querySelectorAll("[data-view]")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => changeView(button.dataset.view)
        );
    });

async function loadRound() {
    showMessage(
        "Bestellrunde wird geladen …"
    );

    if (!window.ILO_DB) {
        showMessage(
            "Die Datenbankdatei js/db.js wurde nicht geladen.",
            "error"
        );

        return;
    }

    if (!ILO_DB.configured) {
        getElement("setup").classList.remove("hidden");

        showMessage(
            "Supabase ist noch nicht vollständig konfiguriert. " +
            "Bitte js/config.js kontrollieren.",
            "error"
        );

        return;
    }

    const code = getElement("roundCode")
        .value
        .trim();

    if (!code) {
        showMessage(
            "Bitte einen Bestellcode eingeben.",
            "error"
        );

        return;
    }

    const loadButton =
        getElement("loadRoundButton");

    loadButton.disabled = true;
    loadButton.textContent = "Wird geladen …";

    try {
        const loadedRound =
            await ILO_DB.activeRound(code);

        if (!loadedRound) {
            currentRound = null;
            menuItems = [];

            renderMenu();

            showMessage(
                "Keine offene Bestellrunde für diesen Code gefunden. " +
                "Bitte Bestellcode, Status und Bestellfrist prüfen.",
                "error"
            );

            return;
        }

        const loadedMenu =
            await ILO_DB.menu(loadedRound.id);

        if (!loadedMenu.length) {
            currentRound = loadedRound;
            menuItems = [];

            renderMenu();

            showMessage(
                "Die Bestellrunde wurde gefunden, enthält aber " +
                "keine verfügbaren Menüpositionen.",
                "error"
            );

            return;
        }

        currentRound = loadedRound;
        menuItems = loadedMenu;

        getElement("roundBadge").textContent =
            "Bestellrunde offen";

        getElement("roundInfo").textContent =
            [
                loadedRound.restaurant_name,
                loadedRound.restaurant_phone
            ]
                .filter(Boolean)
                .join(" · ");

        getElement("deadline").textContent =
            new Date(
                loadedRound.deadline
            ).toLocaleString(
                "de-DE",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );

        renderCategories();
        renderMenu();

        showMessage(
            `${menuItems.length} Gerichte wurden geladen.`,
            "success"
        );
    } catch (error) {
        console.error(
            "Fehler beim Laden der Bestellrunde:",
            error
        );

        currentRound = null;
        menuItems = [];

        renderMenu();

        showMessage(
            "Bestellrunde konnte nicht geladen werden" +
            (error.code ? ` [${error.code}]` : "") +
            ": " +
            (error.message || "Unbekannter Fehler"),
            "error"
        );
    } finally {
        loadButton.disabled = false;
        loadButton.textContent =
            "Speisekarte laden";
    }
}

getElement("loadRoundButton").addEventListener(
    "click",
    loadRound
);

getElement("roundCode").addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            event.preventDefault();
            loadRound();
        }
    }
);

getElement("search").addEventListener(
    "input",
    renderMenu
);

getElement("category").addEventListener(
    "change",
    renderMenu
);

function renderCategories() {
    const categories = [
        ...new Set(
            menuItems.map(item => item.category)
        )
    ];

    getElement("category").innerHTML =
        '<option value="">Alle Kategorien</option>' +
        categories
            .map(
                category =>
                    `<option value="${escapeHtml(category)}">` +
                    `${escapeHtml(category)}` +
                    "</option>"
            )
            .join("");
}

function renderMenu() {
    const menuContainer = getElement("menu");

    if (!menuItems.length) {
        menuContainer.innerHTML =
            '<div class="card panel">' +
            "<p>Noch keine Speisekarte geladen.</p>" +
            "</div>";

        return;
    }

    const searchTerm = getElement("search")
        .value
        .toLowerCase()
        .trim();

    const selectedCategory =
        getElement("category").value;

    const filteredItems = menuItems.filter(item => {
        const matchesCategory =
            !selectedCategory ||
            item.category === selectedCategory;

        const searchableText = [
            item.name,
            item.description,
            item.item_number,
            item.category
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !searchTerm ||
            searchableText.includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    if (!filteredItems.length) {
        menuContainer.innerHTML =
            '<div class="card panel">' +
            "<p>Keine passenden Gerichte gefunden.</p>" +
            "</div>";

        return;
    }

    menuContainer.innerHTML =
        filteredItems
            .map(item => `
                <article class="card dish">
                    <div class="top">
                        <span class="tag">
                            ${escapeHtml(item.item_number)}
                        </span>

                        <b>${euro(item.price)}</b>
                    </div>

                    <h3>${escapeHtml(item.name)}</h3>

                    <p>
                        ${escapeHtml(item.description)}
                    </p>

                    <div>
                        <span class="tag">
                            ${escapeHtml(item.category)}
                        </span>
                    </div>

                    <div class="dish-controls">
                        <select id="spice-${item.id}">
                            <option value="mild">
                                mild
                            </option>

                            <option
                                value="mittelscharf"
                                selected
                            >
                                mittelscharf
                            </option>

                            <option value="scharf">
                                scharf
                            </option>
                        </select>

                        <select id="side-${item.id}">
                            <option value="keine Beilage">
                                keine Beilage
                            </option>

                            <option value="Reis">
                                Reis
                            </option>

                            <option value="Naan">
                                Naan
                            </option>

                            <option value="Roti">
                                Roti
                            </option>
                        </select>

                        <input
                            id="note-${item.id}"
                            placeholder="Sonderwunsch"
                        >

                        <button
                            type="button"
                            class="primary"
                            onclick="addItem('${item.id}')"
                        >
                            Hinzufügen
                        </button>
                    </div>
                </article>
            `)
            .join("");
}

window.addItem = function addItem(itemId) {
    const menuItem = menuItems.find(
        item => item.id === itemId
    );

    if (!menuItem) {
        showMessage(
            "Das ausgewählte Gericht wurde nicht gefunden.",
            "error"
        );

        return;
    }

    const spice =
        getElement(`spice-${itemId}`).value;

    const side =
        getElement(`side-${itemId}`).value;

    const note =
        getElement(`note-${itemId}`)
            .value
            .trim();

    const cartKey = [
        itemId,
        spice,
        side,
        note
    ].join("|");

    const existingLine = cart.find(
        line => line.key === cartKey
    );

    if (existingLine) {
        existingLine.quantity += 1;
    } else {
        cart.push({
            key: cartKey,
            menu_item_id: itemId,
            item_number: menuItem.item_number,
            name: menuItem.name,
            unit_price: Number(menuItem.price),
            quantity: 1,
            spice,
            side,
            note
        });
    }

    renderCart();

    showMessage(
        `${menuItem.name} wurde zum Warenkorb hinzugefügt.`,
        "success"
    );
};

function renderCart() {
    const total = cart.reduce(
        (sum, line) =>
            sum +
            Number(line.unit_price) *
            Number(line.quantity),
        0
    );

    const count = cart.reduce(
        (sum, line) =>
            sum + Number(line.quantity),
        0
    );

    getElement("cartCount").textContent =
        String(count);

    getElement("cartTotal").textContent =
        euro(total);

    getElement("dialogTotal").textContent =
        euro(total);

    if (!cart.length) {
        getElement("cartLines").innerHTML =
            "<p>Der Warenkorb ist leer.</p>";

        return;
    }

    getElement("cartLines").innerHTML =
        cart
            .map(
                (line, index) => `
                    <div class="row">
                        <div>
                            <b>
                                ${line.quantity}
                                ×
                                ${escapeHtml(line.name)}
                            </b>

                            <div class="muted">
                                ${escapeHtml(line.spice)}
                                ·
                                ${escapeHtml(line.side)}
                                ${
                                    line.note
                                        ? " · " +
                                          escapeHtml(line.note)
                                        : ""
                                }
                            </div>
                        </div>

                        <div>
                            ${euro(
                                line.quantity *
                                line.unit_price
                            )}

                            <br>

                            <button
                                type="button"
                                onclick="removeItem(${index})"
                            >
                                Entfernen
                            </button>
                        </div>
                    </div>
                `
            )
            .join("");
}

window.removeItem = function removeItem(index) {
    cart.splice(index, 1);
    renderCart();
};

getElement("cartButton").addEventListener(
    "click",
    () => {
        showCartMessage("");
        getElement("cartDialog").showModal();
    }
);

function createEditToken() {
    if (
        window.crypto &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    const randomValues = new Uint8Array(16);

    crypto.getRandomValues(randomValues);

    return Array.from(randomValues)
        .map(
            value =>
                value
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");
}

const submitOrderButton =
    getElement("submitOrder");

submitOrderButton.addEventListener(
    "click",
    async () => {
        showCartMessage(
            "Bestellung wird geprüft …"
        );

        const participantName =
            getElement("participantName")
                .value
                .trim();

        const roundCode =
            getElement("roundCode")
                .value
                .trim();

        console.log(
            "Bestellbutton wurde betätigt.",
            {
                participantName,
                roundCode,
                currentRound,
                cart
            }
        );

        if (!window.ILO_DB) {
            showCartMessage(
                "js/db.js wurde nicht geladen.",
                "error"
            );

            return;
        }

        if (!ILO_DB.configured) {
            showCartMessage(
                "Supabase ist noch nicht vollständig konfiguriert. " +
                "Bitte js/config.js kontrollieren.",
                "error"
            );

            return;
        }

        if (!currentRound) {
            showCartMessage(
                "Es wurde noch keine Bestellrunde geladen. " +
                "Bitte den Bestellcode FRA-7428 eingeben und " +
                "die Speisekarte laden.",
                "error"
            );

            return;
        }

        if (!participantName) {
            showCartMessage(
                "Bitte vor dem Absenden deinen Namen eingeben.",
                "error"
            );

            return;
        }

        if (!roundCode) {
            showCartMessage(
                "Bitte einen Bestellcode eingeben.",
                "error"
            );

            return;
        }

        if (!cart.length) {
            showCartMessage(
                "Der Warenkorb ist leer. " +
                "Bitte mindestens ein Gericht auswählen.",
                "error"
            );

            return;
        }

        const editToken =
            createEditToken();

        const orderNote =
            getElement("orderNote")
                .value
                .trim();

        const payload = {
            p_round_code: roundCode,
            p_participant_name: participantName,
            p_edit_token: editToken,
            p_note: orderNote,
            p_items: cart.map(line => ({
                menu_item_id: line.menu_item_id,
                quantity: Number(line.quantity),
                spice: line.spice || "",
                side: line.side || "",
                note: line.note || ""
            }))
        };

        console.log(
            "Bestellung wird an Supabase gesendet:",
            payload
        );

        submitOrderButton.disabled = true;
        submitOrderButton.textContent =
            "Wird gespeichert …";

        showCartMessage(
            "Bestellung wird zentral gespeichert …"
        );

        try {
            const orderId =
                await ILO_DB.submit(payload);

            console.log(
                "Bestellung wurde gespeichert:",
                orderId
            );

            localStorage.setItem(
                `ilo_edit_${currentRound.id}`,
                JSON.stringify({
                    orderId,
                    editToken,
                    name: participantName
                })
            );

            cart = [];
            renderCart();

            showCartMessage(
                "Die Bestellung wurde erfolgreich zentral gespeichert.",
                "success"
            );

            setTimeout(
                () => {
                    getElement("cartDialog").close();

                    showMessage(
                        "Bestellung wurde erfolgreich gespeichert.",
                        "success"
                    );
                },
                1200
            );
        } catch (error) {
            console.error(
                "Fehler beim Absenden der Bestellung:",
                error
            );

            const errorCode = error.code
                ? ` [${error.code}]`
                : "";

            showCartMessage(
                "Bestellung 