import { supabase } from "./supabase.js";
import { requireAuth } from "./auth.js";

/************************************
 * ADD TO CART
 ************************************/
export async function addToCart(productId) {
  const { user } = await requireAuth("buyer", "buyer-login.html");
  
  // check if item already exists
  const { data: existing } = await supabase
    .from("cart")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from("cart")
      .update({ qty: existing.qty + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart").insert({
      user_id: user.id,
      product_id: productId,
      qty: 1
    });
  }
  
  window.showToast?.("Added to cart 🛒", "#22c55e");
}

/************************************
 * INCREASE QTY
 ************************************/
export async function increaseQty(rowId, currentQty) {
  await supabase
    .from("cart")
    .update({ qty: currentQty + 1 })
    .eq("id", rowId);
  
  loadCart();
}

/************************************
 * DECREASE QTY
 ************************************/
export async function decreaseQty(rowId, currentQty) {
  if (currentQty <= 1) {
    await supabase.from("cart").delete().eq("id", rowId);
    window.showToast?.("Removed from cart ❌", "#ef4444");
  } else {
    await supabase
      .from("cart")
      .update({ qty: currentQty - 1 })
      .eq("id", rowId);
  }
  
  loadCart();
}

/************************************
 * LOAD CART PAGE
 ************************************/
export async function loadCart() {
  const { user } = await requireAuth("buyer", "buyer-login.html");
  
  const list = document.getElementById("cartList");
  const totalEl = document.getElementById("totalPrice");
  if (!list) return;
  
  const { data: cartRows, error } = await supabase
    .from("cart")
    .select("id, qty, product_id, products(*)")
    .eq("user_id", user.id);
  
  if (error) {
    list.innerHTML = "<p>Error loading cart.</p>";
    return;
  }
  
  if (!cartRows || cartRows.length === 0) {
    list.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.textContent = "₱0.00";
    return;
  }
  
  list.innerHTML = "";
  let total = 0;
  
  cartRows.forEach((row) => {
    const p = row.products;
    const subtotal = p.price * row.qty;
    total += subtotal;
    
    const div = document.createElement("div");
    div.className = "cart-item";
    
    div.innerHTML = `
      <div>
        <strong>${p.name}</strong><br>
        <small>₱${p.price} × ${row.qty}</small><br>
        <small><b>Subtotal:</b> ₱${subtotal}</small>
      </div>

      <div class="qty-controls">
        <button onclick="Cart.decreaseQty(${row.id}, ${row.qty})">−</button>
        <span>${row.qty}</span>
        <button onclick="Cart.increaseQty(${row.id}, ${row.qty})">+</button>
      </div>
    `;
    
    list.appendChild(div);
  });
  
  totalEl.textContent = "₱" + total.toLocaleString();
}

/************************************
 * PLACE ORDER (FULL CHECKOUT)
 ************************************/
export async function placeOrder() {
  const { user } = await requireAuth("buyer", "buyer-login.html");
  
  // Read checkout form values
  const name = document.getElementById("name")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const address = document.getElementById("address")?.value.trim();
  const payment = document.getElementById("payment")?.value;
  const notes = document.getElementById("notes")?.value.trim();
  
  if (!name || !phone || !address || !payment) {
    window.showToast?.("Please complete all fields ❗", "#ef4444");
    return;
  }
  
  // Get cart items
  const { data: cartRows, error } = await supabase
    .from("cart")
    .select("id, qty, product_id, products(*)")
    .eq("user_id", user.id);
  
  if (error || !cartRows || cartRows.length === 0) {
    window.showToast?.("Your cart is empty ❗", "#ef4444");
    return;
  }
  
  let total = 0;
  const firstProduct = cartRows[0].products;
  const storeId = firstProduct.store_id;
  
  cartRows.forEach((row) => {
    total += Number(row.products.price) * row.qty;
  });
  
  // Insert order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      store_id: storeId,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      payment_method: payment,
      notes,
      status: "placed",
      total_amount: total
    })
    .select()
    .single();
  
  if (orderErr) {
    console.error(orderErr);
    window.showToast?.("Order failed ❌", "#ef4444");
    return;
  }
  
  // Insert order_items
  for (const row of cartRows) {
    await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: row.product_id,
      qty: row.qty,
      price: row.products.price
    });
  }
  
  // Clear cart
  await supabase.from("cart").delete().eq("user_id", user.id);
  
  window.showToast?.("Order placed 🎉", "#22c55e");
  
  setTimeout(() => {
    window.location.href = "buyer-orders.html";
  }, 1200);
}