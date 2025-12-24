const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

router.post(
  "/tenants/:tenantId/users",
  auth,
  userController.addUser
);

router.get(
  "/tenants/:tenantId/users",
  auth,
  userController.listUsers
);


module.exports = router;
