import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://zulhijimyaduugtzkobz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bGhpamlteWFkdXVndHprb2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDUwNjQsImV4cCI6MjA4MDMyMTA2NH0.Mwrlu10lSmKxBYuAw8SidPHeISjLxs-NUMJhcuFHBlU"
);

export const PRODUCT_BUCKET = "product-images";