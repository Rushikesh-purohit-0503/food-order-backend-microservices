const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const morgan = require("morgan");

// AFTER
const db = require("./shared/db/postgres");


const app = express();
const SERVICE_NAME = "AUTH-SERVICE"; // change per service
app.use(
    morgan((tokens, req, res) => {
        return [
            `[${SERVICE_NAME}]`,
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            "-",
            tokens["response-time"](req, res),
            "ms"
        ].join(" ");
    }   )
);
app.use(express.json());
async function initDB(retries = 10, delay = 3000) {
  while (retries) {
    try {
      console.log("[AUTH-SERVICE] Trying to connect to DB...");

      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL
        )
      `);

      console.log("[AUTH-SERVICE] DB ready");
      return;
    } catch (err) {
      retries -= 1;
      console.error(
        `[AUTH-SERVICE] DB not ready, retries left: ${retries}`,
        err.code
      );

      if (!retries) {
        console.error("[AUTH-SERVICE] DB connection failed permanently");
        process.exit(1);
      }

      await new Promise(res => setTimeout(res, delay));
    }
  }
}
initDB().then(() => {
  app.listen(4001, () => {
    console.log("[AUTH-SERVICE] Running on port 4001");
  });
});

app.post("/auth/register", async (req, res) => {
  const { email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 8);


  await db.query(
    "INSERT INTO users VALUES($1,$2,$3,$4)",
    [uuid(), email, hash, role || "USER"]
  );

  res.json({ message: "User registered" });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
  if (!result.rows.length) return res.sendStatus(401);

  const user = result.rows[0];
  if (!bcrypt.compareSync(password, user.password)) return res.sendStatus(401);

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token });
});

