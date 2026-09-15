console.log("Indian Lunch Order: app.js wird geladen");

document.addEventListener(
    "DOMContentLoaded",
    function () {
        console.log(
            "Indian Lunch Order: DOM vollständig geladen"
        );

        const getElement = id =>
            document.getElementById(id);

        const formatEuro = value =>
            Number(value || 0).toLocaleString(
                "de-DE",
                {
                    style: "currency",
                    currency: "EUR"
                }
            );

        let currentRound = null;
        let currentMenu = [];
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
            const element =
                getElement("message");

            if (!element) {
                console.error(
                    "Element message wurde nicht gefunden"
                );

                return;
            }

            element.className = type;
            element.textContent = text;
        }

        function showCartMessage(text, type = "") {
            const element =
                getElement("cartMessage");

            if (!element) {
                return;
            }

            element.className = type;
            element.textContent = text;
        }

        function changeView(viewName) {
            const orderView =
                getElement("orderView");

            const managerView =
                getElement("managerView");

            orderView.classList.toggle(
                "hidden",
                viewName !== "order"
            );

            managerView.classList.toggle(
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
                    function () {
                        changeView(
                            button.dataset.view
                        );
                    }
                );
            });

        function validateDatabaseConnection() {
            if (!window.ILO_DB) {
                showMessage(
                    "Die Datei js/db.js wurde nicht korrekt geladen.",
                    "error"
                );

                return false;
            }

            if (!ILO_DB.configured) {
                const setup =
                    getElement("setup");

                setup.classList.remove("hidden");

                showMessage(
                    "Supabase ist nicht vollständig konfiguriert. " +
                    "Bitte js/config.js prüfen.",
                    "error"
                );

                return false;
            }

            getElement("setup")
                .classList
                .add("hidden");

            return true;
        }

        async function loadRound() {
            showMessage(
                "Bestellrunde wird geladen …"
            );

            if (!validateDatabaseConnection()) {
                return;
            }

            const code =
                getElement("roundCode")
                    .value
                    .trim();

            if (!code) {
                showMessage(
                    "Bitte einen Bestellcode eingeben.",
                    "error"
                );

                return;
            }

            const button =
                getElement("loadRoundButton");

            button.disabled = true;
            button.textContent =
                "Wird geladen …";

            try {
                const round =
                    await ILO_DB.activeRound(code);

                if (!round) {
                    currentRound = null;
                    currentMenu = [];

                    renderMenu();

                    showMessage(
                        "Keine offene Bestellrunde für diesen Code gefunden.",
                        "error"
                    );

                    return;
                }

                const menu =
                    await ILO_DB.loadMenu(round.id);

                if (!menu.length) {
                    currentRound = round;
                    currentMenu = [];

                    renderMenu();

                    showMessage(
                        "Die Bestellrunde wurde gefunden, " +
                        "enthält aber keine Menüpositionen.",
                        "error"
                    );

                    return;
                }

                currentRound = round;
                currentMenu = menu;

                getElement("roundBadge")
                    .textContent =
                    "Bestellrunde offen";

                getElement("roundInfo")
                    .textContent =
                    [
                        round.restaurant_name,
                        round.restaurant_phone
                    ]
                        .filter(Boolean)
                        .join(" · ");

                getElement("deadline")
                    .textContent =
                    new Date(
                        round.deadline
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
                    `${menu.length} Gerichte wurden geladen.`,
                    "success"
                );
            } catch (error) {
                console.error(
                    "Bestellrunde konnte nicht geladen werden:",
                    error
                );

                currentRound = null;
                currentMenu = [];

                renderMenu();

                showMessage(
                    "Bestellrunde konnte nicht geladen werden" +
                    (
                        error.code
                            ? ` [${error.code}]`
                            : ""
                    ) +
                    ": " +
                    error.message,
                    "error"
                );
            } finally {
                button.disabled = false;
                button.textContent =
                    "Speisekarte laden";
            }
        }

        getElement("loadRoundButton")
            .addEventListener(
                "click",
                loadRound
            );

        getElement("roundCode")
            .addEventListener(
                "keydown",
                function (event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        loadRound();
                    }
                }
            );

        getElement("search")
            .addEventListener(
                "input",
                renderMenu
            );

        getElement("category")
            .addEventListener(
                "change",
                renderMenu
            );

        function renderCategories() {
            const categories = [
                ...new Set(
                    currentMenu
                        .map(item => item.category)
                        .filter(Boolean)
                )
            ];

            getElement("category").innerHTML =
                '<option value="">' +
                "Alle Kategorien" +
                "</option>" +
                categories
                    .map(category => {
                        return (
                            '<option value="' +
                            escapeHtml(category) +
                            '">' +
                            escapeHtml(category) +
                            "</option>"
                        );
                    })
                    .join("");
        }

        function renderMenu() {
            const container =
                getElement("menu");

            if (!currentMenu.length) {
                container.innerHTML =
                    '<div class="card panel">' +
                    "<p>Noch keine Speisekarte geladen.</p>" +
                    "</div>";

                return;
            }

            const searchTerm =
                getElement("search")
                    .value
                    .toLowerCase()
                    .trim();

            const category =
                getElement("category").value;

            const filteredMenu =
                currentMenu.filter(item => {
                    const matchesCategory =
                        !category ||
                        item.category === category;

                    const searchableText = [
                        item.item_number,
                        item.name,
                        item.description,
                        item.category
                    ]
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !searchTerm ||
                        searchableText.includes(
                            searchTerm
                        );

                    return (
                        matchesCategory &&
                        matchesSearch
                    );
                });

            if (!filteredMenu.length) {
                container.innerHTML =
                    '<div class="card panel">' +
                    "<p>Keine passenden Gerichte gefunden.</p>" +
                    "</div>";

                return;
            }

            container.innerHTML =
                filteredMenu
                    .map(item => {
                        return `
                            <article class="card dish">
                                <div class="top">
                                    <span class="tag">
                                        ${escapeHtml(
                                            item.item_number
                                        )}
                                    </span>

                                    <b>
                                        ${formatEuro(
                                            item.price
                                        )}
                                    </b>
                                </div>

                                <h3>
                                    ${escapeHtml(
                                        item.name
                                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        item.description
                                    )}
                                </p>

                                <div>
                                    <span class="tag">
                                        ${escapeHtml(
                                            item.category
                                        )}
                                    </span>
                                </div>

                                <div class="dish-controls">
                                    <select
                                        id="spice-${item.id}"
                                    >
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

                                    <select
                                        id="side-${item.id}"
                                    >
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
                                        type="text"
                                        placeholder="Sonderwunsch"
                                    >

                                    <button
                                        type="button"
                                        class="primary add-item-button"
                                        data-item-id="${item.id}"
                                    >
                                        Hinzufügen
                                    </button>
                                </div>
                            </article>
                        `;
                    })
                    .join("");

            document
                .querySelectorAll(
                    ".add-item-button"
                )
                .forEach(button => {
                    button.addEventListener(
                        "click",
                        function () {
                            addItem(
                                button.dataset.itemId
                            );
                        }
                    );
                });
        }

        function addItem(itemId) {
            const menuItem =
                currentMenu.find(
                    item => item.id === itemId
                );

            if (!menuItem) {
                showMessage(
                    "Das Gericht wurde nicht gefunden.",
                    "error"
                );

                return;
            }

            const spice =
                getElement(
                    `spice-${itemId}`
                ).value;

            const side =
                getElement(
                    `side-${itemId}`
                ).value;

            const note =
                getElement(
                    `note-${itemId}`
                )
                    .value
                    .trim();

            const cartKey = [
                itemId,
                spice,
                side,
                note
            ].join("|");

            const existingItem =
                cart.find(
                    item => item.key === cartKey
                );

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    key: cartKey,
                    menu_item_id: itemId,
                    item_number:
                        menuItem.item_number,
                    name: menuItem.name,
                    unit_price:
                        Number(menuItem.price),
                    quantity: 1,
                    spice,
                    side,
                    note
                });
            }

            renderCart();

            showMessage(
                `${menuItem.name} wurde hinzugefügt.`,
                "success"
            );
        }

        function renderCart() {
            const total =
                cart.reduce(
                    (sum, item) => {
                        return (
                            sum +
                            Number(
                                item.unit_price
                            ) *
                            Number(
                                item.quantity
                            )
                        );
                    },
                    0
                );

            const count =
                cart.reduce(
                    (sum, item) => {
                        return (
                            sum +
                            Number(
                                item.quantity
                            )
                        );
                    },
                    0
                );

            getElement("cartCount")
                .textContent =
                String(count);

            getElement("cartTotal")
                .textContent =
                formatEuro(total);

            getElement("dialogTotal")
                .textContent =
                formatEuro(total);

            if (!cart.length) {
                getElement("cartLines")
                    .innerHTML =
                    "<p>Der Warenkorb ist leer.</p>";

                return;
            }

            getElement("cartLines")
                .innerHTML =
                cart
                    .map(
                        (item, index) => {
                            return `
                                <div class="row">
                                    <div>
                                        <b>
                                            ${item.quantity}
                                            ×
                                            ${escapeHtml(
                                                item.name
                                            )}
                                        </b>

                                        <div class="muted">
                                            ${escapeHtml(
                                                item.spice
                                            )}
                                            ·
                                            ${escapeHtml(
                                                item.side
                                            )}
                                            ${
                                                item.note
                                                    ? " · " +
                                                      escapeHtml(
                                                          item.note
                                                      )
                                                    : ""
                                            }
                                        </div>
                                    </div>

                                    <div>
                                        ${formatEuro(
                                            item.quantity *
                                            item.unit_price
                                        )}

                                        <br>

                                        <button
                                            type="button"
                                            class="remove-item-button"
                                            data-index="${index}"
                                        >
                                            Entfernen
                                        </button>
                                    </div>
                                </div>
                            `;
                        }
                    )
                    .join("");

            document
                .querySelectorAll(
                    ".remove-item-button"
                )
                .forEach(button => {
                    button.addEventListener(
                        "click",
                        function () {
                            const index =
                                Number(
                                    button.dataset.index
                                );

                            cart.splice(index, 1);
                            renderCart();
                        }
                    );
                });
        }

        getElement("cartButton")
            .addEventListener(
                "click",
                function () {
                    showCartMessage("");

                    const dialog =
                        getElement("cartDialog");

                    if (
                        typeof dialog.showModal ===
                        "function"
                    ) {
                        dialog.showModal();
                    } else {
                        alert(
                            "Der Browser unterstützt den Warenkorb-Dialog nicht."
                        );
                    }
                }
            );

        function createEditToken() {
            if (
                window.crypto &&
                typeof crypto.randomUUID ===
                    "function"
            ) {
                return crypto.randomUUID();
            }

            const randomValues =
                new Uint8Array(16);

            crypto.getRandomValues(
                randomValues
            );

            return Array
                .from(randomValues)
                .map(value => {
                    return value
                        .toString(16)
                        .padStart(2, "0");
                })
                .join("");
        }

        getElement("submitOrder")
            .addEventListener(
                "click",
                async function () {
                    const submitButton =
                        getElement("submitOrder");

                    const participantName =
                        getElement(
                            "participantName"
                        )
                            .value
                            .trim();

                    const roundCode =
                        getElement("roundCode")
                            .value
                            .trim();

                    showCartMessage(
                        "Bestellung wird geprüft …"
                    );

                    if (
                        !validateDatabaseConnection()
                    ) {
                        showCartMessage(
                            "Supabase ist nicht vollständig konfiguriert.",
                            "error"
                        );

                        return;
                    }

                    if (!currentRound) {
                        showCartMessage(
                            "Bitte zuerst die Bestellrunde laden.",
                            "error"
                        );

                        return;
                    }

                    if (!participantName) {
                        showCartMessage(
                            "Bitte deinen Namen eingeben.",
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
                            "Der Warenkorb ist leer.",
                            "error"
                        );

                        return;
                    }

                    const editToken =
                        createEditToken();

                    const payload = {
                        p_round_code:
                            roundCode,
                        p_participant_name:
                            participantName,
                        p_edit_token:
                            editToken,
                        p_note:
                            getElement(
                                "orderNote"
                            )
                                .value
                                .trim(),
                        p_items:
                            cart.map(item => ({
                                menu_item_id:
                                    item.menu_item_id,
                                quantity:
                                    Number(
                                        item.quantity
                                    ),
                                spice:
                                    item.spice || "",
                                side:
                                    item.side || "",
                                note:
                                    item.note || ""
                            }))
                    };

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "Wird gespeichert …";

                    showCartMessage(
                        "Bestellung wird zentral gespeichert …"
                    );

                    try {
                        const orderId =
                            await ILO_DB
                                .submitOrder(
                                    payload
                                );

                        localStorage.setItem(
                            `ilo_edit_${currentRound.id}`,
                            JSON.stringify({
                                orderId,
                                editToken,
                                name:
                                    participantName
                            })
                        );

                        cart = [];
                        renderCart();

                        showCartMessage(
                            "Die Bestellung wurde erfolgreich gespeichert.",
                            "success"
                        );

                        setTimeout(
                            function () {
                                getElement(
                                    "cartDialog"
                                ).close();

                                showMessage(
                                    "Bestellung wurde erfolgreich gespeichert.",
                                    "success"
                                );
                            },
                            1000
                        );
                    } catch (error) {
                        console.error(
                            "Bestellung fehlgeschlagen:",
                            error
                        );

                        showCartMessage(
                            "Bestellung fehlgeschlagen" +
                            (
                                error.code
                                    ? ` [${error.code}]`
                                    : ""
                            ) +
                            ": " +
                            error.message,
                            "error"
                        );
                    } finally {
                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            "Bestellung absenden";
                    }
                }
            );

        async function initializeManager() {
            if (
                !validateDatabaseConnection()
            ) {
                return;
            }

            try {
                const session =
                    await ILO_DB.getSession();

                getElement("loginCard")
                    .classList
                    .toggle(
                        "hidden",
                        Boolean(session)
                    );

                getElement("managerApp")
                    .classList
                    .toggle(
                        "hidden",
                        !session
                    );

                if (session) {
                    await loadManagerData();
                }
            } catch (error) {
                getElement("loginMessage")
                    .textContent =
                    error.message;
            }
        }

        getElement("loginButton")
            .addEventListener(
                "click",
                async function () {
                    const email =
                        getElement(
                            "managerEmail"
                        )
                            .value
                            .trim();

                    const password =
                        getElement(
                            "managerPassword"
                        ).value;

                    const loginMessage =
                        getElement(
                            "loginMessage"
                        );

                    if (!email || !password) {
                        loginMessage.className =
                            "error";

                        loginMessage.textContent =
                            "Bitte E-Mail-Adresse und Passwort eingeben.";

                        return;
                    }

                    loginMessage.className = "";
                    loginMessage.textContent =
                        "Anmeldung wird geprüft …";

                    try {
                        await ILO_DB.login(
                            email,
                            password
                        );

                        loginMessage.className =
                            "success";

                        loginMessage.textContent =
                            "Anmeldung erfolgreich.";

                        await initializeManager();
                    } catch (error) {
                        loginMessage.className =
                            "error";

                        loginMessage.textContent =
                            "Anmeldung fehlgeschlagen: " +
                            error.message;
                    }
                }
            );

        getElement("logoutButton")
            .addEventListener(
                "click",
                async function () {
                    try {
                        await ILO_DB.logout();
                        await initializeManager();
                    } catch (error) {
                        alert(
                            "Abmeldung fehlgeschlagen: " +
                            error.message
                        );
                    }
                }
            );

        document
            .querySelectorAll("[data-tab]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    function () {
                        document
                            .querySelectorAll(
                                ".tab"
                            )
                            .forEach(tab => {
                                tab.classList.add(
                                    "hidden"
                                );
                            });

                        getElement(
                            `${button.dataset.tab}Tab`
                        ).classList.remove(
                            "hidden"
                        );
                    }
                );
            });

        async function loadManagerData() {
            const ordersList =
                getElement("ordersList");

            ordersList.innerHTML =
                "<p>Bestellungen werden geladen …</p>";

            try {
                const round =
                    await ILO_DB
                        .getLatestRound();

                if (!round) {
                    ordersList.innerHTML =
                        "<p>Keine Bestellrunde vorhanden.</p>";

                    return;
                }

                const orders =
                    await ILO_DB
                        .getOrders(round.id);

                const allItems =
                    orders.flatMap(order => {
                        return (
                            order.order_items || []
                        ).map(item => ({
                            ...item,
                            participantName:
                                order.participant_name
                        }));
                    });

                const total =
                    allItems.reduce(
                        (sum, item) => {
                            return (
                                sum +
                                Number(
                                    item.quantity
                                ) *
                                Number(
                                    item.unit_price
                                )
                            );
                        },
                        0
                    );

                const positionCount =
                    allItems.reduce(
                        (sum, item) => {
                            return (
                                sum +
                                Number(
                                    item.quantity
                                )
                            );
                        },
                        0
                    );

                getElement("managerStats")
                    .innerHTML = `
                        <div class="stat">
                            Bestellungen
                            <b>${orders.length}</b>
                        </div>

                        <div class="stat">
                            Positionen
                            <b>${positionCount}</b>
                        </div>

                        <div class="stat">
                            Gesamt
                            <b>${formatEuro(total)}</b>
                        </div>

                        <div class="stat">
                            Status
                            <b>${escapeHtml(
                                round.status
                            )}</b>
                        </div>
                    `;

                if (!orders.length) {
                    ordersList.innerHTML =
                        "<p>Noch keine Bestellungen vorhanden.</p>";
                } else {
                    ordersList.innerHTML =
                        orders
                            .map(order => {
                                const descriptions =
                                    (
                                        order
                                            .order_items ||
                                        []
                                    )
                                        .map(item => {
                                            return (
                                                item.quantity +
                                                " × " +
                                                escapeHtml(
                                                    item.item_name
                                                )
                                            );
                                        })
                                        .join(", ");

                                return `
                                    <div class="row">
                                        <div>
                                            <b>
                                                ${escapeHtml(
                                                    order.participant_name
                                                )}
                                            </b>

                                            <div class="muted">
                                                ${descriptions}
                                            </div>
                                        </div>

                                        <b>
                                            ${formatEuro(
                                                order.total_amount
                                            )}
                                        </b>
                                    </div>
                                `;
                            })
                            .join("");
                }

                const groupedItems = {};

                allItems.forEach(item => {
                    const key = [
                        item.menu_item_id,
                        item.spice,
                        item.side,
                        item.note
                    ].join("|");

                    if (!groupedItems[key]) {
                        groupedItems[key] = {
                            ...item,
                            quantity: 0
                        };
                    }

                    groupedItems[key]
                        .quantity +=
                        Number(item.quantity);
                });

                const groupedList =
                    Object.values(
                        groupedItems
                    );

                getElement("phoneHeader")
                    .innerHTML = `
                        <p>
                            <b>
                                ${escapeHtml(
                                    round.restaurant_name
                                )}
                            </b>
                            ·
                            ${escapeHtml(
                                round.restaurant_phone
                            )}
                            ·
                            Gesamt
                            ${formatEuro(total)}
                        </p>
                    `;

                if (!groupedList.length) {
                    getElement("phoneList")
                        .innerHTML =
                        "<p>Noch keine Bestellpositionen vorhanden.</p>";
                } else {
                    getElement("phoneList")
                        .innerHTML =
                        groupedList
                            .map(item => {
                                return `
                                    <label class="phone-line">
                                        <input type="checkbox">

                                        <span>
                                            <b>
                                                ${item.quantity}
                                                ×
                                                ${escapeHtml(
                                                    item.item_number
                                                )}
                                                ${escapeHtml(
                                                    item.item_name
                                                )}
                                            </b>

                                            <br>

                                            <span class="muted">
                                                ${escapeHtml(
                                                    item.spice
                                                )},
                                                ${escapeHtml(
                                                    item.side
                                                )}
                                                ${
                                                    item.note
                                                        ? ", " +
                                                          escapeHtml(
                                                              item.note
                                                          )
                                                        : ""
                                                }
                                            </span>
                                        </span>
                                    </label>
                                `;
                            })
                            .join("");
                }

                window.phoneOrderText = [
                    round.restaurant_name,
                    round.restaurant_phone,
                    "",
                    ...groupedList.map(item => {
                        return [
                            item.quantity,
                            "x",
                            item.item_number,
                            item.item_name,
                            "-",
                            item.spice,
                            item.side,
                            item.note || ""
                        ].join(" ");
                    }),
                    "",
                    `Gesamt: ${formatEuro(total)}`
                ].join("\n");
            } catch (error) {
                console.error(
                    "Managerdaten konnten nicht geladen werden:",
                    error
                );

                ordersList.innerHTML =
                    '<p class="error">' +
                    escapeHtml(error.message) +
                    "</p>";
            }
        }

        getElement("copyOrder")
            .addEventListener(
                "click",
                async function () {
                    try {
                        await navigator
                            .clipboard
                            .writeText(
                                window
                                    .phoneOrderText ||
                                ""
                            );

                        alert(
                            "Bestellung wurde kopiert."
                        );
                    } catch (error) {
                        alert(
                            "Bestellung konnte nicht kopiert werden."
                        );
                    }
                }
            );

        getElement("exportCsv")
            .addEventListener(
                "click",
                function () {
                    const content =
                        "\ufeff" +
                        (
                            window
                                .phoneOrderText ||
                            ""
                        );

                    const blob =
                        new Blob(
                            [content],
                            {
                                type:
                                    "text/csv;charset=utf-8"
                            }
                        );

                    const link =
                        document.createElement(
                            "a"
                        );

                    link.href =
                        URL.createObjectURL(blob);

                    link.download =
                        "bestellung.csv";

                    link.click();

                    URL.revokeObjectURL(
                        link.href
                    );
                }
            );

        getElement("saveRound")
            .addEventListener(
                "click",
                async function () {
                    const message =
                        getElement(
                            "roundSaveMessage"
                        );

                    const roundData = {
                        restaurant_name:
                            getElement(
                                "restaurantName"
                            ).value.trim(),
                        restaurant_phone:
                            getElement(
                                "restaurantPhone"
                            ).value.trim(),
                        access_code:
                            getElement(
                                "newRoundCode"
                            ).value.trim(),
                        deadline:
                            getElement(
                                "newDeadline"
                            ).value,
                        delivery_time:
                            getElement(
                                "deliveryTime"
                            ).value || null,
                        status:
                            getElement(
                                "roundStatus"
                            ).value
                    };

                    if (
                        !roundData.restaurant_name ||
                        !roundData.access_code ||
                        !roundData.deadline
                    ) {
                        message.className =
                            "error";

                        message.textContent =
                            "Restaurant, Bestellcode und Bestellfrist sind erforderlich.";

                        return;
                    }

                    message.className = "";
                    message.textContent =
                        "Bestellrunde wird gespeichert …";

                    try {
                        await ILO_DB
                            .saveRound(
                                roundData
                            );

                        message.className =
                            "success";

                        message.textContent =
                            "Bestellrunde wurde gespeichert.";

                        await loadManagerData();
                    } catch (error) {
                        message.className =
                            "error";

                        message.textContent =
                            "Bestellrunde konnte nicht gespeichert werden: " +
                            error.message;
                    }
                }
            );

        renderCart();
        renderMenu();
        validateDatabaseConnection();

        console.log(
            "Indian Lunch Order: Benutzeroberfläche initialisiert"
        );
    }
);
