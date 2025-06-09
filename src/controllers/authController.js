const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashed]
    );
    const user = userResult.rows[0];

    await pool.query(
      'INSERT INTO profile (user_id, full_name, bio, address) VALUES ($1, $2, $3, $4)',
      [user.user_id, '', '', '']
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 jam

    await pool.query(
      'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, token, expiresAt]
    );

    const verificationPageUrl = "https://becycle-web.netlify.app";
    const verificationPagePath = "/verify-email";

    const verificationLink = `${verificationPageUrl}${verificationPagePath}?id=${user.user_id}&token=${token}`

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Becycle Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifikasi Email Akun Becycle Anda",
      html: `<p>Halo ${user.username || user.email},</p>
             <p>Terima kasih sudah mendaftar. Silakan klik link di bawah ini untuk memverifikasi alamat email Anda:</p>
             <p><a href="${verificationLink}">Verifikasi Email Saya</a></p>
             <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
             <p>Jika Anda tidak melakukan registrasi akun, abaikan email ini.</p>
             <p>Terima kasih,</p>
             <p>Tim Becycle</p>`,
    });

    res.status(201).send('Registered! Please check your email to verify your account.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Registration failed');
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).send('User not found');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send('Invalid password');

    if (!user.is_verified) {
      return res.status(403).send('Please verify your email before logging in.');
    }

    if (user.auth_provider !== 'local') {
      return res.status(403).send('Use Google login for this account.');
    }
    
    const accessToken = jwt.sign(
      { user_id: user.user_id, email: user.email, isVerified: user.is_verified },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
      [user.user_id, refreshToken]
    );

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).send('Login failed');
  }
};

exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).send('User data missing from Google callback');
    }

    const email = req.user.emails[0].value;
    const username = req.user.displayName;
    const profilePicture = req.user.photos?.[0]?.value || 'default-profile-picture-url';

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    if (!user) {
      const insert = await pool.query(
        `INSERT INTO users (username, email, password, profile_picture, is_verified, auth_provider)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [username, email, null, profilePicture, true, 'google']
      );
      user = insert.rows[0];
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, isVerified: user.is_verified },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.redirect(`/success?token=${token}`);
  } catch (err) {
    console.error('Error in Google callback:', err.message);
    res.status(500).send('Google login failed: ' + err.message);
  }
};


exports.verifyEmail = async (req, res) => {
  try {
    const { id, token } = req.query;

    if (!id || !token) {
      return res.status(400).json({ message: "Informasi verifikasi tidak lengkap." });
    }

    const result = await pool.query(
      'SELECT * FROM verification_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
      [id, token]
    );

    const tokenData = result.rows[0];
    if (!tokenData) {
      return res.status(400).json({ message: "Link verifikasi tidak valid atau sudah kedaluwarsa." });
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE WHERE user_id = $1',
      [id]
    );

    await pool.query('DELETE FROM verification_tokens WHERE user_id = $1', [id]);

    res.status(200).json({ message: "Email berhasil diverifikasi! Anda sekarang bisa login di aplikasi." });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ message: "Terjadi kesalahan internal saat verifikasi email." });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(404).send("User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.user_id, token, expires]
    );

    const netlifyAppBaseUrl = "https://becycle-web.netlify.app";
    const resetPagePath = "/reset-password";

    const resetLink = `${netlifyAppBaseUrl}${resetPagePath}?token=${token}`

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Becycle Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Link Reset Password Akun Becycle Anda",
      html: `<p>Halo ${user.username || user.email},</p>
             <p>Anda meminta untuk mereset password akun Anda.</p>
             <p>Silakan klik link berikut untuk melanjutkan proses reset password:</p>
             <p><a href="${resetLink}">Reset Password Saya</a></p>
             <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
             <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
             <p>Terima kasih,</p>
             <p>Tim Becycle</p>`,
    });

    res.send("Password reset email sent. Silakan periksa inbox Anda.");
  } catch (err) {
    console.error("Error sending reset email:", err.message);
    console.error(err.stack);
    res
      .status(500)
      .send("Gagal mengirim email reset password. Silakan coba lagi nanti.");
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    const tokenData = result.rows[0];
    if (!tokenData) return res.status(400).json({ message: "Invalid or expired token"});

    const userResult = await pool.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [tokenData.user_id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ message: "User not found"});

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users SET password = $1 WHERE user_id = $2`,
      [hashed, user.user_id]
    );

    await pool.query(
      `DELETE FROM password_reset_tokens WHERE token = $1`,
      [token]
    );

    res.status(200).json({ message: "Password telah berhasil direset!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resetting password" });
  }
};


exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).send("No token");

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2',
      [payload.user_id, refreshToken]
    );
    if (result.rowCount === 0) return res.status(403).send("Invalid token");

    const newAccessToken = jwt.sign(
      { user_id: payload.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(403).send("Invalid or expired token");
  }
};

exports.renderResetPasswordPage = async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    const tokenData = result.rows[0];
    if (!tokenData) return res.status(400).send("Invalid or expired token");

    res.send(`<form action="/auth/reset-password/${token}" method="POST">
                <input type="password" name="password" placeholder="Enter new password" required>
                <button type="submit">Reset Password</button>
              </form>`);
  } catch (err) {
    console.error('Error rendering reset page:', err.message);
    res.status(500).send('Error rendering reset page');
  }
};

exports.resendEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).send('User tidak ditemukan');
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).send('Email sudah terverifikasi');
    }

    await pool.query(
      'DELETE FROM verification_tokens WHERE user_id = $1',
      [user.user_id]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 jam

    await pool.query(
      'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, token, expiresAt]
    );

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verificationLink = `https://project-ppl-production.up.railway.app/auth/verify-email/${user.user_id}/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Verify your email (Resend)',
      html: `<p>Click this link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`,
    });

    res.status(200).send('Email verifikasi telah dikirim ulang');
  } catch (err) {
    console.error('Error resending email:', err.message);
    res.status(500).send('Gagal mengirim ulang email verifikasi');
  }
};

exports.resendForgotPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).send('User tidak ditemukan');
    }

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.user_id]);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); 

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.user_id, token, expires]
    );

    const resetLink = `https://project-ppl-production.up.railway.app/auth/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password (Resend)",
      html: `<p>Click this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    });

    res.status(200).send("Email reset password telah dikirim ulang");
  } catch (err) {
    console.error("Error sending reset password email:", err.message);
    res.status(500).send("Gagal mengirim ulang email reset password");
  }
};