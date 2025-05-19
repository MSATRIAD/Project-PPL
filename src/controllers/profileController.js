const pool = require("../config/db");
const path = require('path');

exports.getProfile = async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) return res.status(400).send("Id undefined");

  try {
    const profileResult = await pool.query(
      "SELECT * FROM profile WHERE user_id = $1",
      [user_id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).send("Profile not found");
    }

    const expResult = await pool.query(
      "SELECT exp FROM users WHERE user_id = $1",
      [user_id]
    );

    const profile = profileResult.rows[0];
    const exp = expResult.rows[0]?.exp || 0;

    res.status(200).json({
      ...profile,
      exp,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.editProfile = async (req, res) => {
  const { user_id } = req.params;
  const { email, username, profile } = req.body;

  if (!user_id) return res.status(400).send("Id undefined");

  try {
    await pool.query(
      "UPDATE users SET email = $1, username = $2 WHERE user_id = $3",
      [email, username, user_id]
    );

    await pool.query(
      "UPDATE profile SET full_name = $1, bio = $2, address = $3 WHERE user_id = $4",
      [
        profile.full_name,
        profile.bio,
        profile.address,
        user_id
      ]
    );

    res.status(200).send("Profile updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.deleteProfile = async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) return res.status(400).send("Id undefined");

  try {
    await pool.query("DELETE FROM profile WHERE user_id = $1", [user_id]);
    await pool.query("DELETE FROM users WHERE user_id = $1", [user_id]);

    res.status(200).send("Profile deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.body.user_id;
    if (!req.file || !userId) {
      return res.status(400).json({ message: 'File atau user_id tidak ada' });
    }

    const filePath = `/uploads/profile_pictures/${req.file.filename}`;

    await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE user_id = $2',
      [filePath, userId]
    );

    res.json({ message: 'Upload sukses', imagePath: filePath });
  } catch (err) {
    console.error('Error saat upload:', err);
    res.status(500).json({ message: 'Gagal upload gambar' });
  }
};
