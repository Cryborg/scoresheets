import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      // Build outputs
      ".next/",
      "dist/",
      "build/",
      
      // Dependencies
      "node_modules/",
      
      // Generated files
      "*.generated.*",
      
      // Test coverage
      "coverage/",
      
      // Environment files
      ".env",
      ".env.local",
      ".env.production",
      ".env.test",
      
      // Database files
      "data/",
      "*.db",
      "*.sqlite",
      "*.sqlite3",
      
      // Logs
      "*.log",
      
      // Temporary files
      ".tmp/",
      "tmp/",
    ],
  },
];

export default eslintConfig;
