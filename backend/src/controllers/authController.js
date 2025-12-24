const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
exports.login = async (req, res) => {
  const { email, password, tenantSubdomain } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  let userQuery;
  let values;

  // Super admin login (no tenant)
  if (!tenantSubdomain) {
    userQuery = `
      SELECT u.*
      FROM users u
      WHERE u.email = $1 AND u.role = 'super_admin'
    `;
    values = [email];
  } else {
    userQuery = `
      SELECT u.*, t.status AS tenant_status
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND t.subdomain = $2
    `;
    values = [email, tenantSubdomain];
  }

  const result = await pool.query(userQuery, values);

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  const user = result.rows[0];

  if (tenantSubdomain && user.tenant_status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Tenant is not active"
    });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      }
    }
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


exports.registerTenant = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      tenantName,
      subdomain,
      adminEmail,
      adminPassword,
      adminFullName
    } = req.body;

    if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    await client.query("BEGIN");

    // Check if subdomain already exists
    const existingTenant = await client.query(
      "SELECT id FROM tenants WHERE subdomain = $1",
      [subdomain]
    );

    if (existingTenant.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Subdomain already exists"
      });
    }

    const tenantId = uuidv4();
    const adminUserId = uuidv4();
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create tenant
    await client.query(
      `INSERT INTO tenants (id, name, subdomain)
       VALUES ($1, $2, $3)`,
      [tenantId, tenantName, subdomain]
    );

    // Create tenant admin
    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, 'tenant_admin')`,
      [adminUserId, tenantId, adminEmail, passwordHash, adminFullName]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Tenant registered successfully",
      data: {
        tenantId,
        subdomain,
        adminUser: {
          id: adminUserId,
          email: adminEmail,
          fullName: adminFullName,
          role: "tenant_admin"
        }
      }
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  } finally {
    client.release();
  }
};
exports.registerTenant = async (req, res) => {
  const {
    tenantName,
    subdomain,
    adminEmail,
    adminPassword,
    adminFullName
  } = req.body;

  if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check subdomain uniqueness
    const existingTenant = await client.query(
      "SELECT id FROM tenants WHERE subdomain = $1",
      [subdomain]
    );

    if (existingTenant.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Subdomain already exists"
      });
    }

    // Create tenant
    const tenantResult = await client.query(
      `INSERT INTO tenants (
        id, name, subdomain, status,
        subscription_plan, max_users, max_projects
      )
      VALUES (
        gen_random_uuid(), $1, $2, 'active',
        'free', 5, 3
      )
      RETURNING id`,
      [tenantName, subdomain]
    );

    const tenantId = tenantResult.rows[0].id;

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create tenant admin
    const userResult = await client.query(
      `INSERT INTO users (
        id, tenant_id, email,
        password_hash, full_name, role
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, 'tenant_admin'
      )
      RETURNING id, email, full_name`,
      [tenantId, adminEmail, passwordHash, adminFullName]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Tenant registered successfully",
      data: {
        tenantId,
        subdomain,
        adminUser: userResult.rows[0]
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  } finally {
    client.release();
  }
};
