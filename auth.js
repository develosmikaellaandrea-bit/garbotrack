import { supabase } from "./supabase.js";

/********************************************
 * VALIDATION HELPERS
 ********************************************/
function showError(msg) {
  alert("⚠️ " + msg);
}

function showSuccess(msg) {
  alert("✅ " + msg);
}

function isEmailValid(email) {
  return /\S+@\S+\.\S+/.test(email);
}

/********************************************
 * AUTH REQUIRED (same)
 ********************************************/
export async function requireAuth(expectedRole, redirect) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = redirect;
    return;
  }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  
  if (!profile || profile.role !== expectedRole) {
    window.location.href = redirect;
    return;
  }
  
  return { user, profile };
}

/********************************************
 * BUYER SIGNUP
 ********************************************/
export async function signupBuyer(fullName, email, password) {
  
  // VALIDATION
  if (!fullName.trim()) return showError("Full name is required.");
  if (!email.trim()) return showError("Email is required.");
  if (!isEmailValid(email)) return showError("Invalid email address.");
  if (!password.trim()) return showError("Password is required.");
  if (password.length < 6) return showError("Password must be at least 6 characters.");
  
  // SUPABASE SIGNUP
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return showError(error.message);
  
  // CREATE PROFILE ROW
  await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role: "buyer",
  });
  
  showSuccess("Buyer account created successfully!");
  window.location.href = "buyer-login.html";
}

/********************************************
 * BUYER LOGIN
 ********************************************/
export async function loginBuyer(email, password) {
  
  if (!email.trim()) return showError("Email is required.");
  if (!isEmailValid(email)) return showError("Invalid email.");
  if (!password.trim()) return showError("Password is required.");
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError("Incorrect email or password.");
  
  showSuccess("Login successful!");
  window.location.href = "buyer-dashboard.html";
}

/********************************************
 * SELLER SIGNUP
 ********************************************/
export async function signupSeller(fullName, email, password) {
  
  if (!fullName.trim()) return showError("Full name is required.");
  if (!email.trim()) return showError("Email is required.");
  if (!isEmailValid(email)) return showError("Invalid email.");
  if (!password.trim()) return showError("Password is required.");
  if (password.length < 6) return showError("Password must be at least 6 characters.");
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return showError(error.message);
  
  await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role: "seller",
  });
  
  showSuccess("Seller account created!");
  window.location.href = "seller-login.html";
}

/********************************************
 * SELLER LOGIN
 ********************************************/
export async function loginSeller(email, password) {
  
  if (!email.trim()) return showError("Email required.");
  if (!isEmailValid(email)) return showError("Invalid email.");
  if (!password.trim()) return showError("Password required.");
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError("Incorrect email or password.");
  
  showSuccess("Login successful!");
  window.location.href = "seller-dashboard.html";
}

/********************************************
 * LOGOUT
 ********************************************/
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}