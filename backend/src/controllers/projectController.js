const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createProject = async (req, res) => {
  const { name, description } = req.body;
  const tenantId = req.user.tenantId;
  const createdBy = req.user.userId;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Project name is required"
    });
  }

  try {
    // Get tenant limits
    const tenantResult = await pool.query(
      "SELECT max_projects FROM tenants WHERE id = $1",
      [tenantId]
    );

    const maxProjects = tenantResult.rows[0].max_projects;

    // Count existing projects
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM projects WHERE tenant_id = $1",
      [tenantId]
    );

    if (parseInt(countResult.rows[0].count) >= maxProjects) {
      return res.status(403).json({
        success: false,
        message: "Project limit reached for this subscription plan"
      });
    }

    const projectId = uuidv4();

    const result = await pool.query(
      `INSERT INTO projects (
        id, tenant_id, name, description, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [projectId, tenantId, name, description || null, createdBy]
    );

    return res.status(201).json({
      success: true,
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

exports.listProjects = async (req, res) => {
  const tenantId = req.user.tenantId;

  try {
    const result = await pool.query(
      `SELECT 
         p.id,
         p.name,
         p.description,
         p.status,
         p.created_at,
         u.full_name AS created_by
       FROM projects p
       JOIN users u ON p.created_by = u.id
       WHERE p.tenant_id = $1
       ORDER BY p.created_at DESC`,
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
