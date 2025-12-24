const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

router.post("/login", authController.login);
router.get("/me", auth, authController.me);
router.post("/register-tenant", authController.registerTenant);


module.exports = router;
