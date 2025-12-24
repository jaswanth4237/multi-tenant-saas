const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createTask = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, priority, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Task title is required"
    });
  }

  try {
    // Verify project + get tenant
    const projectResult = await pool.query(
      "SELECT tenant_id FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const tenantId = projectResult.rows[0].tenant_id;

    // Tenant isolation
    if (tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized tenant access"
      });
    }

    // Validate assigned user
    if (assignedTo) {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND tenant_id = $2",
        [assignedTo, tenantId]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Assigned user does not belong to this tenant"
        });
      }
    }

    const taskId = uuidv4();

    const result = await pool.query(
      `INSERT INTO tasks (
        id, project_id, tenant_id, title, description,
        priority, assigned_to, due_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        taskId,
        projectId,
        tenantId,
        title,
        description || null,
        priority || "medium",
        assignedTo || null,
        dueDate || null
      ]
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

exports.listProjectTasks = async (req, res) => {
  const { projectId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    // Verify project ownership
    const projectResult = await pool.query(
      "SELECT tenant_id FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    if (projectResult.rows[0].tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized tenant access"
      });
    }

    const result = await pool.query(
      `SELECT 
         t.id,
         t.title,
         t.description,
         t.status,
         t.priority,
         t.due_date,
         t.created_at,
         u.id AS assigned_user_id,
         u.full_name AS assigned_user_name,
         u.email AS assigned_user_email
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [projectId]
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
