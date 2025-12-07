import { supabase } from "./supabase.js";

export async function uploadToBucket(bucket, path, file) {
  return await supabase.storage.from(bucket).upload(path, file);
}

export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}