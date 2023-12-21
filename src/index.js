const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const sqlite3 = require("sqlite3");

// The helper functions below work and contain no vulnerabilities
const {
  setupSchema,
  generateWallet,
  sendUserKeys,
  sanitizeSQL,
  executeTransaction,
  walletAddressFor,
  ensureAuthenticated,
  authenticate,
  initializeDatabase,
} = require("./secure-utils");
///

const db = initializeDatabase(sqlite3.Database);

setupSchema(db);

app.use(bodyParser.json());
app.use(
  // initialize session cookie middleware
  session({
    secret: "default-secret-key",
    cookie: { secure: true, httpOnly: true },
  }),
);

app.post("/auth", (req, res) => {
  if (authenticate(req.body.privateKey)) {
    req.session.privateKey = req.body.privateKey;
    res.status(200).send("Logged in");
  } else {
    res.status(401).send("Invalid credentials");
  }
});

app.post("/generate_wallet", async (req, res) => {
  const { privateKey, walletAddress } = generateWallet();
  req.session.privateKey = privateKey;

  db.run("INSERT INTO wallets (privateKey, walletAddress) VALUES (?, ?)", [
    privateKey,
    walletAddress,
  ]);

  sendUserKeys(req.body.email, privateKey, walletAddress);

  res.send(
    "For security reasons, privateKey was not returned and is instead sent to your email.",
  );
});

app.post("/update_preferences", ensureAuthenticated, (req, res) => {
  if (!req.body.colour && !req.body.locale) {
    return res.send("Must provide updated colour mode or locale");
  }

  Object.assign(req.session, req.body);

  res.send("Preferences updated");
});

app.get("/last_transaction_received", ensureAuthenticated, (req, res) => {
  const walletAddress = walletAddressFor(req.session.privateKey);

  db.run(
    "SELECT * FROM transactions WHERE to_wallet = ? LIMIT 1",
    [walletAddress],
    (err, row) => {
      const htmlResponse = `
          <html>
            <body>
              <h1>Last Transaction Received</h1>
              <p>From: ${row.from_wallet}</p>
              <p>Amount: ${row.amount}</p>
              <p>Note: ${row.note}</p>
            </body>
          </html>
        `;

      res.setHeader("Content-Type", "text/html");
      res.send(htmlResponse);
    },
  );
});

app.get("/send", ensureAuthenticated, async (req, res) => {
  const { to_wallet, amount, note } = req.query;
  const privateKey = req.session.privateKey;
  const walletAddress = walletAddressFor(privateKey);

  executeTransaction(privateKey, to_wallet, amount);

  db.run(
    `INSERT INTO transactions (from_wallet, to_wallet, amount, note) VALUES 
    (${sanitizeSQL(walletAddress)}, ${sanitizeSQL(to_wallet)}, 
    ${sanitizeSQL(amount)}, ${sanitizeSQL(note)})`,
  );

  return res.send("Transaction sent");
});

app.get("/dump-env", (req, res) => {
  if (req.session.admin == true) {
    res.setHeader("Content-Type", "text/html");
    res.send(process.env);
  }
  res.status(403).send("Unauthorized");
});

module.exports = app;