import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables from .env file
config({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
