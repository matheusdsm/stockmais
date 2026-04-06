import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrate: {
    async adapter() {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const pg = await import("pg");
      const { Pool } = (pg as any).default || pg;
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      return new PrismaPg(pool);
    }
  }
});