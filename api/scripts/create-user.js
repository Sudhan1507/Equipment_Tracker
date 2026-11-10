// Usage:
// node scripts/create-user.js supervisor supervisor@example.com "StrongPassword123" "Super" "Visor"
// node scripts/create-user.js technician tech@example.com "StrongPassword123" "Tech" "Nician"
require("dotenv").config();
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../src/db");

async function main() {
  const [, , roleArg, emailArg, password, fnameArg, lnameArg] = process.argv;
  const role = String(roleArg || "").toUpperCase();
  const email = String(emailArg || "").trim().toLowerCase();
  const fname = String(fnameArg || "").trim();
  const lname = String(lnameArg || "").trim();

  if (!["TECHNICIAN", "SUPERVISOR"].includes(role) || !email || !password || !fname || !lname) {
    console.error('Usage: node scripts/create-user.js <supervisor|technician> <email> <password> <firstName> <lastName>');
    process.exitCode = 1;
    return;
  }

  const id = randomUUID();
  const userName = email.split("@")[0];
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await pool.execute(
      `INSERT INTO user_master
       (id, user_name, fname, lname, email, password_hash, role_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [id, userName, fname, lname, email, passwordHash, role]
    );
    console.log(`${role} created: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
