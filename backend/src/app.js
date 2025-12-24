const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
// app.use("/api", userRoutes);

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use("/api", userRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/projectRoutes"));
app.use("/api", require("./routes/taskRoutes"));


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

module.exports = app;
