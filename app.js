import * as Auth from "./auth.js";
import * as Buyer from "./buyer.js";
import * as Cart from "./cart.js";
import * as Seller from "./seller.js";
import * as Products from "./products.js";
import * as Orders from "./orders.js";
import * as Storage from "./storage.js";

// expose modules to window for inline onclick=""
window.Auth = Auth;
window.Buyer = Buyer;
window.Cart = Cart;
window.Seller = Seller;
window.Products = Products;
window.Orders = Orders;
window.Storage = Storage;

window.showToast = function(msg = "Done!", color = "#1657d6") {
  const t = document.getElementById("toast");
  if (!t) return;
  
  t.textContent = msg;
  t.style.background = color;
  t.style.opacity = "1";
  t.style.transform = "translateX(-50%) translateY(0px)";
  
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(20px)";
  }, 1500);
};