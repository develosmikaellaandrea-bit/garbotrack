import { supabase } from "./supabase.js";
import { requireAuth } from "./auth.js";
import * as Cart from "./cart.js";

/* ============================================================
   1. BUYER DASHBOARD
   ============================================================ */

export async function initBuyerDashboard() {
    const { user, profile } = await requireAuth("buyer", "buyer-login.html");

    // Buyer name
    const nameEl = document.getElementById("buyerName");
    if (nameEl && profile) nameEl.textContent = profile.full_name || "Buyer";

    await Promise.all([
        loadDashboardStats(user.id),
        loadRecentOrders(user.id)
    ]);
}

/* DASHBOARD BADGES */
async function loadDashboardStats(userId) {
    const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .eq("is_visible", true);

    const storeCount = stores?.length || 0;

    const { data: cartRows } = await supabase
        .from("cart")
        .select("qty")
        .eq("user_id", userId);

    let cartCount = 0;
    cartRows?.forEach(r => cartCount += Number(r.qty));

    const { data: pending } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["placed", "preparing", "ready", "delivery"]);

    const pendingCount = pending?.length || 0;

    const { data: completed } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed");

    const completedCount = completed?.length || 0;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("storeCountBadge", storeCount);
    set("cartCountBadge", cartCount);
    set("pendingCountBadge", pendingCount);
    set("completedCountBadge", completedCount);
}

/* RECENT ORDERS */
async function loadRecentOrders(userId) {
    const box = document.getElementById("recentOrders");
    if (!box) return;

    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

    if (!orders || orders.length === 0) {
        box.innerHTML = `<p class="subtext">No recent orders yet.</p>`;
        return;
    }

    const statusLabels = {
        placed: "Placed",
        preparing: "Preparing",
        ready: "Ready",
        delivery: "Delivery",
        delivered: "Delivered",
        completed: "Completed",
        cancelled: "Cancelled"
    };

    box.innerHTML = "";
    orders.forEach(o => {
        const status = statusLabels[o.status] || o.status;

        const div = document.createElement("div");
        div.className = "recent-card";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b>Order #${o.id}</b>
                <span class="recent-status status-${o.status}">${status}</span>
            </div>
            <div class="recent-meta">₱${Number(o.total_amount).toLocaleString()}</div>
        `;
        box.appendChild(div);
    });
}

/* ============================================================
   2. STORES PAGE — ONLY SHOW VISIBLE STORES
   ============================================================ */

export async function loadStores() {
    const list = document.getElementById("storeList");
    if (!list) return;

    list.innerHTML = "Loading stores...";

    const { data: stores, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

    if (error) {
        list.innerHTML = "<p>Error loading stores.</p>";
        console.error(error);
        return;
    }

    if (!stores || stores.length === 0) {
        list.innerHTML = "<p>No stores available.</p>";
        return;
    }

    list.innerHTML = "";
    stores.forEach(store => {
        const div = document.createElement("div");
        div.className = "store-card";
        div.innerHTML = `
            <h3>${store.name}</h3>
            <p>${store.description || "No description."}</p>
            <button onclick="location.href='buyer-menu.html?store=${store.id}'">
                View Menu
            </button>
        `;
        list.appendChild(div);
    });
}

/* ============================================================
   3. STORE MENU PAGE — HIDDEN STORES REDIRECT ONLY
   ============================================================ */

export async function loadStoreMenu() {
    const storeId = new URLSearchParams(location.search).get("store");
    const list = document.getElementById("menuList");
    const title = document.getElementById("storeName");

    if (!storeId) {
        location.href = "buyer-stores.html";
        return;
    }

    // Load ONLY visible stores
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .eq("is_visible", true)
        .single();

    // ❗ If store is hidden or not found → redirect silently
    if (!store) {
        location.href = "buyer-stores.html";
        return;
    }

    if (title) title.textContent = store.name;

    // Load products
    const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId);

    if (!products || products.length === 0) {
        list.innerHTML = "<p>No items available.</p>";
        return;
    }

    // Render products
    list.innerHTML = "";
    products.forEach(p => {
        const img = p.image_url || "https://via.placeholder.com/300x200?text=Food";
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <img src="${img}">
            <h3>${p.name}</h3>
            <p>${p.description || ""}</p>
            <p><strong>₱${Number(p.price).toLocaleString()}</strong></p>
            <button class="add-to-cart-btn">Add to Cart</button>
        `;

        card.querySelector(".add-to-cart-btn")
            .addEventListener("click", () => Cart.addToCart(p.id));

        list.appendChild(card);
    });
}

/* ============================================================
   4. BUYER ORDERS PAGE
   ============================================================ */

export async function loadBuyerOrders(silent = false) {
    const { user } = await requireAuth("buyer", "buyer-login.html");
    const container = document.getElementById("orderList");

    if (!container) return;
    if (!silent) container.innerHTML = "Loading orders...";

    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (!orders || orders.length === 0) {
        container.innerHTML = "<p>No orders yet.</p>";
        return;
    }

    const storeIds = [...new Set(orders.map(o => o.store_id))];
    const storeMap = {};

    if (storeIds.length) {
        const { data: stores } = await supabase
            .from("stores")
            .select("id, name, phone, messenger_link")
            .in("id", storeIds);

        stores?.forEach(s => (storeMap[s.id] = s));
    }

    const statusLabels = {
        placed: "Placed",
        preparing: "Preparing",
        ready: "Ready",
        delivery: "Delivery",
        delivered: "Delivered",
        completed: "Completed",
        cancelled: "Cancelled"
    };

    const timelineSteps = [
        "placed",
        "preparing",
        "ready",
        "delivery",
        "delivered",
        "completed"
    ];

    container.innerHTML = "";

    for (const o of orders) {
        const store = storeMap[o.store_id] || {};
        const storeName = store.name || "Store";
        const phone = store.phone || "";
        const messenger = store.messenger_link || "";

        const { data: items } = await supabase
            .from("order_items")
            .select("qty, price, products(name)")
            .eq("order_id", o.id);

        let itemsHTML = "<li><small>No items found.</small></li>";
        if (items?.length) {
            itemsHTML = items
                .map(i => `
                    <li>
                        <span>${i.products?.name || "Item"} × ${i.qty}</span>
                        <small>₱${Number(i.price * i.qty).toLocaleString()}</small>
                    </li>
                `)
                .join("");
        }

        const currentIndex = timelineSteps.indexOf(o.status);
        const timelineHTML =
            `<div class="timeline">` +
            timelineSteps
                .map((t, i) => `
                    <div class="timeline-step ${i <= currentIndex ? "active" : ""}">
                        <div class="dot"></div>
                        <span>${statusLabels[t]}</span>
                    </div>
                `)
                .join("") +
            `</div>`;

        let contactHTML = `
            <div class="contact-box">
                For changes/cancellation, contact the seller:
                <div class="contact-buttons">
        `;

        if (phone)
            contactHTML += `<a href="tel:${phone}" class="contact-btn primary">📞 Call / SMS</a>`;

        if (messenger)
            contactHTML += `<a href="${messenger}" target="_blank" class="contact-btn secondary">💬 Messenger</a>`;

        contactHTML += `</div></div>`;

        const card = document.createElement("div");
        card.className = "order-card";
        card.innerHTML = `
            <div class="order-top">
                <div>
                    <h3>Order #${o.id}</h3>
                    <div class="order-store">Store: <b>${storeName}</b></div>
                </div>
                <div>
                    <span class="status-label status-${o.status}">
                        ${statusLabels[o.status]}
                    </span>
                </div>
            </div>

            ${timelineHTML}

            <div class="order-details">
                <p><b>Name:</b> ${o.customer_name}</p>
                <p><b>Phone:</b> ${o.customer_phone}</p>
                <p><b>Address:</b> ${o.customer_address}</p>
                <p><b>Payment:</b> ${o.payment_method}</p>
                <p><b>Notes:</b> ${o.notes || "None"}</p>
                <p><b>Total:</b> ₱${Number(o.total_amount).toLocaleString()}</p>
            </div>

            <div class="items-title">Items</div>
            <ul class="order-items-list">${itemsHTML}</ul>

            ${contactHTML}
        `;

        container.appendChild(card);
    }
}

/* ============================================================
   5. COMPLETED ORDERS
   ============================================================ */

export async function loadCompleted() {
    const { user } = await requireAuth("buyer", "buyer-login.html");

    const box = document.getElementById("completedList");
    if (!box) return;

    box.innerHTML = "Loading completed orders...";

    const { data: rows } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

    if (!rows || rows.length === 0) {
        box.innerHTML = "<p>No completed orders.</p>";
        return;
    }

    box.innerHTML = "";
    rows.forEach(r => {
        const div = document.createElement("div");
        div.className = "completed-card";
        div.innerHTML = `
            <h3>Order #${r.id}</h3>
            <p><b>Total:</b> ₱${Number(r.total_amount).toLocaleString()}</p>
            <p><small>${new Date(r.created_at).toLocaleString()}</small></p>
        `;
        box.appendChild(div);
    });
}