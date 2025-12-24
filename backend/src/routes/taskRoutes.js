const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const taskController = require("../controllers/taskController");

router.post(
  "/projects/:projectId/tasks",
  auth,
  taskController.createTask
);

module.exports = router;
