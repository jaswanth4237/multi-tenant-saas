const bcrypt = require("bcrypt");
const pool = require("../config/db");

exports.addUser = async (req, res) => {
  const { tenantId } = req.params;
  const { email, password, fullName, role = "user" } = req.body;

  // Only tenant_admin allowed
  if (req.user.role !== "tenant_admin") {
    return res.status(403).json({
      success: false,
      message: "Only tenant admin can add users"
    });
  }

  if (!email || !password || !fullName) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  // Tenant isolation check
  if (req.user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized tenant access"
    });
  }

  try {
    // Get tenant limits
    const tenantResult = await pool.query(
      "SELECT max_users FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found"
      });
    }

    const maxUsers = tenantResult.rows[0].max_users;

    // Count current users
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
      [tenantId]
    );

    if (parseInt(countResult.rows[0].count) >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: "User limit reached for this subscription plan"
      });
    }

    // Check email uniqueness per tenant
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE tenant_id = $1 AND email = $2",
      [tenantId, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists in this tenant"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        id, tenant_id, email, password_hash,
        full_name, role
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5
      )
      RETURNING id, email, full_name, role, created_at`,
      [tenantId, email, passwordHash, fullName, role]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.listUsers = async (req, res) => {
  const { tenantId } = req.params;

  // Tenant isolation
  if (req.user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized tenant access"
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM users
       WHERE tenant_id = $1
       ORDER BY created_at ASC`,
      [tenantId]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
