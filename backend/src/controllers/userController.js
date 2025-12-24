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

exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const { fullName, role, isActive } = req.body;

  // Only tenant admin
  if (req.user.role !== "tenant_admin") {
    return res.status(403).json({
      success: false,
      message: "Only tenant admin can update users"
    });
  }

  try {
    // Get user
    const userResult = await pool.query(
      "SELECT id, tenant_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    // Tenant isolation
    if (user.tenant_id !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized tenant access"
      });
    }

    // Prevent self role change
    if (req.user.userId === userId && role && role !== req.user.role) {
      return res.status(400).json({
        success: false,
        message: "Cannot change your own role"
      });
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${index++}`);
      values.push(fullName);
    }

    if (role !== undefined) {
      updates.push(`role = $${index++}`);
      values.push(role);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${index++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${index}
       RETURNING id, email, full_name, role, is_active`,
      values
    );

    return res.json({
      success: true,
      message: "User updated successfully",
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

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  // Only tenant admin
  if (req.user.role !== "tenant_admin") {
    return res.status(403).json({
      success: false,
      message: "Only tenant admin can delete users"
    });
  }

  // Prevent self-delete
  if (req.user.userId === userId) {
    return res.status(403).json({
      success: false,
      message: "Cannot delete yourself"
    });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, tenant_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    // Tenant isolation
    if (user.tenant_id !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized tenant access"
      });
    }

    // Unassign tasks
    await pool.query(
      "UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1",
      [userId]
    );

    // Delete user
    await pool.query(
      "DELETE FROM users WHERE id = $1",
      [userId]
    );

    return res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
