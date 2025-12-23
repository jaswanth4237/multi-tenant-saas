const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const userResult = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (userResult.rows.length === 0) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const user = userResult.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    },
  });
};

exports.me = async (req, res) => {
  const userId = req.user.userId;

  const result = await pool.query(
    "SELECT id, email, full_name, role, tenant_id FROM users WHERE id = $1",
    [userId]
  );

  res.json({ success: true, data: result.rows[0] });
};
