import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core + Radix UI (함께 번들링하여 의존성 문제 해결)
          "vendor-react": [
            "react",
            "react-dom",
            "react-router-dom",
            "react/jsx-runtime",
          ],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Payment
          "vendor-payment": ["@tosspayments/payment-sdk"],
        },
      },
    },
  },
}));
