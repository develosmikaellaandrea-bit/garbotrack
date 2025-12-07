import { supabase, PRODUCT_BUCKET } from "./supabase.js";
import { getSellerStore } from "./seller.js";

/************ LOAD PRODUCTS ************/
export async function loadSellerProducts() {
  const store = await getSellerStore();
  const container = document.getElementById("productList");

  if (!store) return container.innerHTML = "Create store first.";

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id);

  if (!data.length) {
    container.innerHTML = "No products yet.";
    return;
  }

  container.innerHTML = "";
  data.forEach(p => {
    container.innerHTML += `
      <div class="product-card">
        <img src="${p.image_url}">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <p>₱${p.price}</p>
        <button onclick="Products.deleteProduct(${p.id})">Delete</button>
      </div>
    `;
  });
}

/************ ADD PRODUCT WITH IMAGE ************/
export async function addProductFromForm() {
  const store = await getSellerStore();
  if (!store) return alert("Create store first.");

  const name = pName.value;
  const description = pDesc.value;
  const price = pPrice.value;
  const category = pCategory.value;
  const file = pImage.files[0];

  if (!name || !price) return alert("Name + price required.");

  let image_url = null;

  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${store.id}-${Date.now()}.${fileExt}`;
    const filePath = `${store.id}/${fileName}`;

    // upload
    const { error: uploadErr } = await supabase
      .storage
      .from(PRODUCT_BUCKET)
      .upload(filePath, file);

    if (uploadErr) return alert(uploadErr.message);

    const { data: urlData } = supabase
      .storage
      .from(PRODUCT_BUCKET)
      .getPublicUrl(filePath);

    image_url = urlData.publicUrl;
  }

  const { error } = await supabase.from("products").insert([
    {
      store_id: store.id,
      name,
      description,
      price,
      category,
      image_url
    }
  ]);

  if (error) return alert(error.message);

  alert("Product added!");
  loadSellerProducts();
}

/************ DELETE ************/
export async function deleteProduct(id) {
  await supabase.from("products").delete().eq("id", id);
  alert("Deleted.");
  loadSellerProducts();
}