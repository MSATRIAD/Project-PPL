const pool = require("../config/db");

exports.getProfile = async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) return res.status(401).send("Id undefined");
  try {
    const profile = await pool.query(
      "SELECT * FROM profile WHERE user_id = $1",
      [user_id]
    );

    if (!profile || profile.length === 0) {
      return res.status(404).send("Invalid");
    }

    res.status(200).send(profile);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.editProfile = async (req, res) => {
  const { user_id } = req.params;
  const { email, username, profile } = req.params;
  if (!user_id) return res.status(401).send("Id undefined");
  try {
    await pool.query(
      "UPDATE users SET email = $1, username = $2, WHERE id = $3",
      [email, username, profile]
    );

    await pool.query(
      `UPDATE profile 
             SET full_name = $1, bio = $2, avatar_url = $3, address = $4 
             WHERE user_id = $5`,
      [
        profile.full_name,
        profile.bio,
        profile.avatar_url,
        profile.address,
        user_id,
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
  if (!user_id) return res.status(401).send("Id undefined");
  try {
    await pool.query("DELETE FROM profile WHERE user_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);

    res.status(200).send("Profile deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
