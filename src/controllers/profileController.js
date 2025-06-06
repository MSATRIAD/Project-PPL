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

    const user = await pool.query(
      "SELECT exp, profile_picture FROM users WHERE user_id = $1",
      [user_id]
    );

    const profile = profileResult.rows[0];
    const exp = user.rows[0]?.exp || 0;
    const profile_picture = user.rows[0]?.profile_picture || null;

    res.status(200).json({
      ...profile,
      exp,
      profile_picture,
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

  try {
    await pool.query('BEGIN');

    const reward = await pool.query('SELECT * FROM rewards WHERE reward_id = $1', [reward_id]);
    if (reward.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Reward not found.' });
    }
    const rewardData = reward.rows[0];

    const user = await pool.query('SELECT points FROM users WHERE user_id = $1', [userId]);
    const userPoints = user.rows[0].points;

    if (userPoints < rewardData.points_required) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient points.' });
    }

    await pool.query('UPDATE users SET points = points - $1 WHERE user_id = $2', [
      rewardData.points_required,
      userId
    ]);

    await pool.query(
      'INSERT INTO reward_redemptions(user_id, reward_id, redeemed_at) VALUES($1, $2, NOW())',
      [userId, reward_id]
    );

    await pool.query('COMMIT');

    const updated = await pool.query('SELECT points FROM users WHERE user_id = $1', [userId]);

    const allRewards = await pool.query('SELECT reward_id, name, image_url, points_required FROM rewards ORDER BY points_required ASC');

    res.json({
      success: true,
      message: 'Reward redeemed successfully.',
      remainingPoints: updated.rows[0].points,
      redeemedReward: {
        id: rewardData.id,
        name: rewardData.name,
        image: rewardData.image_url,
        cost: rewardData.points_required
      },
      rewards: allRewards.rows
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
