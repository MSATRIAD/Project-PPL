const pool = require("../config/db");

exports.getHistory = async (req, res) => {
  const user_id = req.user.user_id;
  if (!user_id) return res.status(401).send("Id undefined");
  try {
    const userHistory = await pool.query(
      "SELECT * FROM result_history WHERE user_id = $1",
      [user_id]
    );
    if (!userHistory || userHistory.length === 0) {
      return res
        .status(404)
        .send("There's no history. Try analyze some images!");
    }
    res.status(201).send(userHistory);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

exports.getHistoryById = async (req, res) => {
  const { user_id, scan_id } = req.body;
  if ((!user_id, !scan_id)) return res.status(401).send("Id undefined");
  try {
    const historyId = await pool.query(
      "SELECT * FROM result_histroy WHERE user_id = $1 AND scan_id = $1",
      [user_id],
      [scan_id]
    );
    if (!historyId) {
      return res.status(404).send("History not found");
    }
    res.status(201).send(historyId);
  } catch (err) {
    console.error(err);
    res.statu(500).send("Server error");
  }
};
