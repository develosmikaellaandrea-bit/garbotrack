import { supabase } from "./supabase.js";
import { getSellerStore } from "./seller.js";

/* ===================================================================
   🔵 BUYER SIDE — LOAD BUYER ORDERS (Used in buyer-orders.html)
   =================================================================== */
export async function loadBuyerOrders(userId) {
  const container = document.getElementById("orderList");
  if (!container) return;
  
  container.innerHTML = "Loading orders...";
  
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (!orders?.length) {
    container.innerHTML = "<p>No orders yet.</p>";
    return;
  }
  
  const statusLabels = {
    placed: "Placed",
    preparing: "Preparing",
    ready: "Ready for Delivery",
    delivery: "Out for Delivery",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  
  const steps = ["placed", "preparing", "ready", "delivery", "delivered", "completed"];
  
  container.innerHTML = "";
  
  for (const o of orders) {
    // Load items
    const { data: items } = await supabase
      .from("order_items")
      .select("qty, price, products(name)")
      .eq("order_id", o.id);
    
    let itemsHTML = items?.map(i => `
      <li>
        <span>${i.products?.name || "Item"} × ${i.qty}</span>
        <small>₱${(i.qty * i.price).toLocaleString()}</small>
      </li>
    `).join("") || "<li>No items</li>";
    
    // Timeline
    const currentStep = steps.indexOf(o.status);
    const timeline = `
      <div class="timeline">
        ${steps.map((s, i) => `
          <div class="timeline-step ${i <= currentStep ? "active" : ""}">
            <div class="dot"></div>
            <span>${statusLabels[s]}</span>
          </div>
        `).join("")}
      </div>
    `;
    
    container.innerHTML += `
      <div class="order-card">
        <h3>Order #${o.id}</h3>
        <span class="status-label status-${o.status}">
          ${statusLabels[o.status]}
        </span>

        ${timeline}

        <p><b>Name:</b> ${o.customer_name}</p>
        <p><b>Phone:</b> ${o.customer_phone}</p>
        <p><b>Address:</b> ${o.customer_address}</p>
        <p><b>Payment:</b> ${o.payment_method}</p>
        <p><b>Notes:</b> ${o.notes || "None"}</p>
        <p><b>Total:</b> ₱${o.total_amount.toLocaleString()}</p>

        <h4 class="items-title">Items</h4>
        <ul class="order-items-list">${itemsHTML}</ul>

        <p style="margin-top:10px; font-size:13px; color:#555;">
          To cancel or change your order, please contact the seller directly.
        </p>
      </div>
    `;
  }
}

/* ===================================================================
   🟣 SELLER SIDE — LOAD ALL STORE ORDERS (Used in seller-orders.html)
   =================================================================== */
export async function loadSellerOrders(silent = false) {
  const store = await getSellerStore();
  const container = document.getElementById("sellerOrdersList");
  
  if (!container) return;
  if (!silent) container.innerHTML = "Loading orders...";
  
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  
  if (!orders?.length) {
    container.innerHTML = "<p>No orders yet.</p>";
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
  
  const steps = ["placed", "preparing", "ready", "delivery", "delivered", "completed"];
  
  container.innerHTML = "";
  
  for (const o of orders) {
    // Load items
    const { data: items } = await supabase
      .from("order_items")
      .select("qty, price, products(name)")
      .eq("order_id", o.id);
    
    const itemsHTML = items?.map(i => `
      <li>
        <span>${i.products?.name} × ${i.qty}</span>
        <small>₱${(i.qty * i.price).toLocaleString()}</small>
      </li>
    `).join("") || "<li>No items</li>";
    
    // Timeline
    const currentStep = steps.indexOf(o.status);
    const timelineHTML = `
      <div class="timeline">
        ${steps.map((s, i) => `
          <div class="timeline-step ${i <= currentStep ? "active" : ""}">
            <div class="dot"></div>
            <span>${statusLabels[s]}</span>
          </div>
        `).join("")}
      </div>
    `;
    
    // Status Buttons
    const buttonsHTML = `
      <div class="status-btns">
        <button class="btn-preparing" onclick="Orders.updateStatus(${o.id}, 'preparing')">Preparing</button>
        <button class="btn-ready" onclick="Orders.updateStatus(${o.id}, 'ready')">Ready</button>
        <button class="btn-delivery" onclick="Orders.updateStatus(${o.id}, 'delivery')">Delivery</button>
        <button class="btn-delivered" onclick="Orders.updateStatus(${o.id}, 'delivered')">Delivered</button>
        <button class="btn-completed" onclick="Orders.updateStatus(${o.id}, 'completed')">Completed</button>
      </div>
    `;
    
    container.innerHTML += `
      <div class="order-card">
        <div class="order-header">
          <h3>Order #${o.id}</h3>
          <span class="status-label status-${o.status}">
            ${statusLabels[o.status]}
          </span>
        </div>

        ${timelineHTML}

        <p><b>Buyer:</b> ${o.customer_name}</p>
        <p><b>Phone:</b> ${o.customer_phone}</p>
        <p><b>Address:</b> ${o.customer_address}</p>
        <p><b>Payment:</b> ${o.payment_method}</p>
        <p><b>Notes:</b> ${o.notes || "None"}</p>
        <p><b>Total:</b> ₱${o.total_amount.toLocaleString()}</p>

        <h4 class="items-title">Items</h4>
        <ul class="order-items-list">${itemsHTML}</ul>

        ${buttonsHTML}
      </div>
    `;
  }
}

/* ===================================================================
   🟢 UPDATE ORDER STATUS (SELLER)
   =================================================================== */
export async function updateStatus(orderId, status) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  
  if (error) {
    alert("Failed to update order.");
    return;
  }
  
  // If completed → add to completed_orders table
  if (status === "completed") {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    
    await supabase.from("completed_orders").insert([{
      order_id: data.id,
      user_id: data.user_id,
      store_id: data.store_id,
      total_amount: data.total_amount
    }]);
  }
  
  loadSellerOrders(true);
}

/* ===================================================================
   🔴 CANCEL ORDER (SELLER)
   =================================================================== */
export async function cancelOrder(orderId) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);
  
  if (error) {
    alert("Cancel failed!");
    return;
  }
  
  alert("Order cancelled!");
  loadSellerOrders(true);
}

/* MAKE FUNCTIONS AVAILABLE IN HTML */
window.Orders = {
  loadSellerOrders,
  loadBuyerOrders,
  updateStatus,
  cancelOrder
};