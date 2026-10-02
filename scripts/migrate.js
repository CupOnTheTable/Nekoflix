// Run this locally with your DIRECT_URL (non-pooled Neon connection string) to apply migrations.
// Example: DIRECT_URL="postgresql://..." node scripts/migrate.js

const { execSync } = require("child_process");

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error("Error: DIRECT_URL or DATABASE_URL environment variable is required.");
  process.exit(1);
}

console.log("Applying Prisma migrations...");
try {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directUrl },
  });
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
