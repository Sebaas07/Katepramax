import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false, // Los tests de integración comparten la app, corren en serie
  },
});
