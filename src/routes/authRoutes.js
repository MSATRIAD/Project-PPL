const express = require("express");
const passport = require("passport");
const router = express.Router();
const auth = require("../controllers/authController");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  auth.googleCallback
);
router.get("/verify-email", auth.verifyEmail);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password/:token", auth.resetPassword);
router.post("/refresh-token", auth.refreshToken);
router.get("/reset-password/:token", auth.renderResetPasswordPage);
router.post("/resend-email", auth.resendEmail);
router.post("/resend-reset", auth.resendForgotPasswordEmail);
router.post("/logout", auth.logout);

module.exports = router;
