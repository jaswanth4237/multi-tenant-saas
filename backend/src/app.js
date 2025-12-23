const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

module.exports = app;
