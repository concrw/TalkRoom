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
        manualChunks: (id) => {
          // React core
          if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router")) {
            return "vendor-react";
          }
          // Radix UI
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // TanStack Query, React Hook Form, Zod
          if (id.includes("node_modules/@tanstack/") ||
              id.includes("node_modules/react-hook-form") ||
              id.includes("node_modules/@hookform/") ||
              id.includes("node_modules/zod")) {
            return "vendor-data";
          }
          // Recharts
          if (id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          // Date utilities
          if (id.includes("node_modules/date-fns") ||
              id.includes("node_modules/react-day-picker")) {
            return "vendor-date";
          }
          // Firebase
          if (id.includes("node_modules/firebase/") ||
              id.includes("node_modules/@firebase/")) {
            return "vendor-firebase";
          }
          // Payment
          if (id.includes("node_modules/@tosspayments/") ||
              id.includes("node_modules/@stripe/") ||
              id.includes("node_modules/stripe")) {
            return "vendor-payment";
          }
          // Supabase
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // UI utils (lucide, tailwind-merge, clsx, etc.)
          if (id.includes("node_modules/lucide-react") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/class-variance-authority")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
}));
