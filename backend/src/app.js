const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
// app.use("/api", userRoutes);

const app = express();
// app.use(cors({ origin: process.env.FRONTEND_URL }));
const allowedOrigins = [
  "http://localhost:3000",
  "http://frontend:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", userRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/projectRoutes"));
app.use("/api", require("./routes/taskRoutes"));


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

module.exports = app;
