// ================================================================
// IMPORTS
// ================================================================
import { supabase } from "./supabase.js";
import { requireAuth } from "./auth.js";

// Allow access from HTML
window.Seller = {};

// ================================================================
// UTILITY: Toast
// ================================================================
window.showToast = function (msg, color = "#1657d6") {
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement("div");
        t.id = "toast";
        t.style = `
            position: fixed;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: ${color};
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 15px;
            opacity: 0;
            transition: .25s;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(t);
    }

    t.textContent = msg;
    t.style.background = color;
    t.style.opacity = 1;
    t.style.transform = "translateX(-50%) translateY(0)";

    setTimeout(() => {
        t.style.opacity = 0;
        t.style.transform = "translateX(-50%) translateY(20px)";
    }, 1600);
};

// ================================================================
// GET THE LOGGED-IN SELLER'S STORE
// ================================================================
export async function getSellerStore() {
    const { user } = await requireAuth("seller", "seller-login.html");

    const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("seller_id", user.id)
        .single();

    if (error || !data) return null;
    return data;
}

window.Seller.getSellerStore = getSellerStore;

// ================================================================
// INIT SELLER DASHBOARD
// ================================================================
export async function initSellerDashboard() {
    const { user, profile } = await requireAuth("seller", "seller-login.html");

    const nameField = document.getElementById("sellerName");
    if (nameField) nameField.textContent = profile.full_name ?? "Seller";

    loadStore();
    loadStoreSettings();
    loadDashboardStats();
    loadRecentOrders();
}

window.Seller.initSellerDashboard = initSellerDashboard;

// ================================================================
// LOAD STORE INFO FOR DASHBOARD
// ================================================================
export async function loadStore() {
    const store = await getSellerStore();
    const box = document.getElementById("storeSection");

    if (!box) return;

    if (!store) {
        box.innerHTML = `
            <p>You don’t have a store yet.</p>
            <button onclick="Seller.createStoreModal()">Create Store</button>
        `;
        return;
    }

    box.innerHTML = `
        <h2>${store.name}</h2>
        <p>${store.description || ""}</p>
        <button onclick="Seller.editStoreModal()">Edit Store</button>
    `;
}

window.Seller.loadStore = loadStore;

// ================================================================
// STORE SETTINGS (VISIBILITY)
// ================================================================
export async function loadStoreSettings() {
    const store = await getSellerStore();
    if (!store) return;

    const toggle = document.getElementById("storeVisibleToggle");
    const label = document.getElementById("visibilityStatus");

    if (!toggle) return;

    toggle.checked = store.is_visible === true;
    if (label)
        label.textContent = store.is_visible ? "Visible to buyers" : "Hidden";
}

export async function saveStoreVisibility() {
    const store = await getSellerStore();
    const toggle = document.getElementById("storeVisibleToggle");

    if (!store || !toggle) return;

    const isVisible = toggle.checked;

    await supabase
        .from("stores")
        .update({ is_visible: isVisible })
        .eq("id", store.id);

    showToast(
        isVisible ? "Store is now visible ✔️" : "Store hidden from buyers ❌",
        isVisible ? "#22c55e" : "#dc2626"
    );

    loadStoreSettings();
}

window.Seller.saveStoreVisibility = saveStoreVisibility;

// ================================================================
// CREATE STORE
// ================================================================
window.Seller.createStoreModal = async () => {
    const name = prompt("Store name:");
    if (!name) return;

    const desc = prompt("Store description:");

    const { user } = await requireAuth("seller");

    const { error } = await supabase.from("stores").insert([
        {
            name,
            description: desc,
            seller_id: user.id,
            is_visible: true,
        },
    ]);

    if (error) {
        showToast("Failed to create store ❌", "#dc2626");
        return;
    }

    showToast("Store created ✔️", "#22c55e");
    loadStore();
};

// ================================================================
// EDIT STORE
// ================================================================
window.Seller.editStoreModal = async () => {
    const store = await getSellerStore();
    if (!store) return;

    const name = prompt("Store name:", store.name);
    if (!name) return;

    const desc = prompt("Store description:", store.description);

    const { error } = await supabase
        .from("stores")
        .update({ name, description: desc })
        .eq("id", store.id);

    if (error) {
        showToast("Store update failed ❌", "#dc2626");
        return;
    }

    showToast("Store updated ✔️", "#22c55e");
    loadStore();
};

// ================================================================
// DASHBOARD STATS
// ================================================================
export async function loadDashboardStats() {
    const store = await getSellerStore();
    if (!store) return;

    // TOTAL ORDERS
    const { data: orders } = await supabase
        .from("orders")
        .select("id, total_amount")
        .eq("store_id", store.id);

    const totalOrders = orders?.length || 0;
    const totalSales = orders?.reduce(
        (sum, o) => sum + Number(o.total_amount),
        0
    );

    const today = new Date().toISOString().slice(0, 10);
    const todaySales = orders
        ?.filter((o) => o.created_at?.startsWith(today))
        ?.reduce((sum, o) => sum + Number(o.total_amount), 0);

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("totalOrders", totalOrders);
    set("totalSales", "₱" + totalSales.toLocaleString());
    set("todaySales", "₱" + todaySales.toLocaleString());
}

window.Seller.loadDashboardStats = loadDashboardStats;

// ================================================================
// RECENT ORDERS
// ================================================================
export async function loadRecentOrders() {
    const store = await getSellerStore();
    if (!store) return;

    const box = document.getElementById("recentOrders");
    if (!box) return;

    const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(3);

    if (!data?.length) {
        box.innerHTML = "<p>No recent orders.</p>";
        return;
    }

    box.innerHTML = data
        .map(
            (o) => `
        <div class='recent-card'>
            <b>Order #${o.id}</b>
            <span class="status-label status-${o.status}">${o.status}</span>
            <div>₱${Number(o.total_amount).toLocaleString()}</div>
        </div>`
        )
        .join("");
}

window.Seller.loadRecentOrders = loadRecentOrders;

// ================================================================
// LOAD ALL ORDERS
// ================================================================
export async function loadSellerOrders() {
    const store = await getSellerStore();
    const list = document.getElementById("sellerOrderList");

    if (!store || !list) return;

    list.innerHTML = "Loading...";

    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .order("id", { ascending: false });

    if (!orders?.length) {
        list.innerHTML = "<p>No orders yet.</p>";
        return;
    }

    list.innerHTML = orders
        .map(
            (o) => `
        <div class="order-card">
            <h3>Order #${o.id}</h3>
            <p><b>Name:</b> ${o.customer_name}</p>
            <p><b>Phone:</b> ${o.customer_phone}</p>
            <p><b>Address:</b> ${o.customer_address}</p>
            <p><b>Status:</b> ${o.status}</p>
            <p><b>Total:</b> ₱${o.total_amount}</p>

            <button onclick="Seller.updateStatus(${o.id}, 'preparing')">Preparing</button>
            <button onclick="Seller.updateStatus(${o.id}, 'ready')">Ready</button>
            <button onclick="Seller.updateStatus(${o.id}, 'delivery')">Delivery</button>
            <button onclick="Seller.updateStatus(${o.id}, 'completed')">Completed</button>
        </div>
    `
        )
        .join("");
}

window.Seller.loadSellerOrders = loadSellerOrders;

// ================================================================
// UPDATE ORDER STATUS
// ================================================================
export async function updateStatus(orderId, status) {
    const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

    if (error) {
        showToast("Failed to update ❌", "#dc2626");
        return;
    }

    showToast("Status updated ✔️", "#22c55e");
    loadSellerOrders();
}

window.Seller.updateStatus = updateStatus;

// ================================================================
// PRODUCT MANAGEMENT
// ================================================================
export async function uploadProductImage(file) {
    if (!file) return null;

    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

    if (uploadErr) {
        showToast("Upload failed ❌", "#dc2626");
        return null;
    }

    const { data: publicUrl } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

    return publicUrl.publicUrl;
}

window.Seller.uploadProductImage = uploadProductImage;

// ================================================================
// ADD PRODUCT
// ================================================================
export async function addProduct() {
    const store = await getSellerStore();
    const name = document.getElementById("prodName").value;
    const desc = document.getElementById("prodDesc").value;
    const price = Number(document.getElementById("prodPrice").value);

    const file = document.getElementById("prodImg").files[0];
    const imgURL = await uploadProductImage(file);

    const { error } = await supabase.from("products").insert([
        {
            store_id: store.id,
            name,
            description: desc,
            price,
            image_url: imgURL,
        },
    ]);

    if (error) {
        showToast("Failed to add product ❌", "#dc2626");
        return;
    }

    showToast("Product added ✔️", "#22c55e");
    location.href = "seller-products.html";
}

window.Seller.addProduct = addProduct;

// ================================================================
// LOAD PRODUCTS
// ================================================================
export async function loadSellerProducts() {
    const store = await getSellerStore();
    const box = document.getElementById("productList");

    if (!store || !box) return;

    const { data } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("id", { ascending: false });

    if (!data?.length) {
        box.innerHTML = "<p>No products yet.</p>";
        return;
    }

    box.innerHTML = data
        .map(
            (p) => `
        <div class="product-card">
            <img src="${p.image_url}">
            <h3>${p.name}</h3>
            <p>₱${Number(p.price).toLocaleString()}</p>

            <button onclick="location.href='seller-edit-product.html?id=${p.id}'">Edit</button>
            <button onclick="Seller.deleteProduct(${p.id})" style="background:#dc2626;">Delete</button>
        </div>
    `
        )
        .join("");
}

window.Seller.loadSellerProducts = loadSellerProducts;

// ================================================================
// DELETE PRODUCT
// ================================================================
export async function deleteProduct(id) {
    const ok = confirm("Delete this product?");
    if (!ok) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
        showToast("Delete failed ❌", "#dc2626");
        return;
    }

    showToast("Product deleted ✔️", "#22c55e");
    loadSellerProducts();
}

window.Seller.deleteProduct = deleteProduct;

// ================================================================
// EDIT PRODUCT PAGE
// ================================================================
export async function loadEditProduct() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return;

    const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (!product) return;

    document.getElementById("prodName").value = product.name;
    document.getElementById("prodDesc").value = product.description;
    document.getElementById("prodPrice").value = product.price;
    document.getElementById("currentImg").src = product.image_url;
}

window.Seller.loadEditProduct = loadEditProduct;

// ================================================================
// UPDATE PRODUCT
// ================================================================
export async function updateProduct() {
    const id = new URLSearchParams(location.search).get("id");
    const name = document.getElementById("prodName").value;
    const desc = document.getElementById("prodDesc").value;
    const price = Number(document.getElementById("prodPrice").value);

    let imgURL = document.getElementById("currentImg").src;

    const newFile = document.getElementById("prodImg").files[0];
    if (newFile) imgURL = await uploadProductImage(newFile);

    const { error } = await supabase
        .from("products")
        .update({
            name,
            description: desc,
            price,
            image_url: imgURL,
        })
        .eq("id", id);

    if (error) {
        showToast("Update failed ❌", "#dc2626");
        return;
    }

    showToast("Product updated ✔️", "#22c55e");
    location.href = "seller-products.html";
}

window.Seller.updateProduct = updateProduct;