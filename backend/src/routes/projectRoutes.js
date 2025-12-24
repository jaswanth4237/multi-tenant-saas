const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const projectController = require("../controllers/projectController");

router.post(
  "/projects",
  auth,
  projectController.createProject
);

router.get(
  "/projects",
  auth,
  projectController.listProjects
);

module.exports = router;
