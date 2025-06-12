const pool = require("../config/db");
const path = require('path');
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.getProfile = async (req, res) => {
  const user_id = req.user.user_id;
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const profileQuery = await pool.query(
      `SELECT p.user_id, p.full_name, p.bio, p.address, u.email, u.username, u.exp, u.points, u.profile_picture
       FROM profile p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.user_id = $1`,
      [user_id]
    );

    if (profileQuery.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json(profileQuery.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.editProfile = async (req, res) => {
  const user_id = req.user.user_id;
  const { full_name, bio, address } = req.body;

  if (!user_id) return res.status(401).json({ message: "Unauthorized" });

  try {
    await pool.query(
      "UPDATE profile SET full_name = $1, bio = $2, address = $3 WHERE user_id = $4",
      [full_name, bio, address, user_id]
    );
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    const userId = req.user.user_id;
    if (!req.file || !userId) {
      return res.status(400).json({ message: "File atau user_id tidak ada" });
    }

    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "profile_pictures",
            public_id: `user_${userId}`,
            overwrite: true,
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);

    await pool.query(
      "UPDATE users SET profile_picture = $1 WHERE user_id = $2",
      [result.secure_url, userId]
    );

    res.json({ message: "Upload sukses", imageUrl: result.secure_url });
  } catch (err) {
    console.error("Error saat upload:", err);
    res.status(500).json({ message: "Gagal upload gambar" });
  }
};

exports.redeemReward = async (req, res) => {
  const userId = req.user.user_id;
  const { reward_id } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rewardResult = await client.query(
      "SELECT * FROM rewards WHERE reward_id = $1",
      [reward_id]
    );
    if (rewardResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Reward not found." });
    }
    const rewardData = rewardResult.rows[0];

    const userResult = await client.query(
      "SELECT points FROM users WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    const userPoints = userResult.rows[0].points;

    if (userPoints < rewardData.points_required) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Poin Anda tidak cukup." });
    }

    const newPoints = userPoints - rewardData.points_required;
    await client.query("UPDATE users SET points = $1 WHERE user_id = $2", [
      newPoints,
      userId,
    ]);

    await client.query(
      "INSERT INTO reward_redemptions(user_id, reward_id, redeemed_at) VALUES($1, $2, NOW())",
      [userId, reward_id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Anda berhasil menukarkan ${rewardData.name}!`,
      remainingPoints: newPoints,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

exports.getAllRewards = async (req, res) => {
  try {
    const allRewards = await pool.query(
      "SELECT reward_id, name, description, image_url, points_required FROM rewards ORDER BY points_required ASC"
    );
    res.status(200).json(allRewards.rows);
  } catch (err) {
    console.error("Error fetching all rewards:", err);
    res.status(500).json({ message: "Server error" });
  }
};
