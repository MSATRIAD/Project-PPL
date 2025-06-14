const pool = require("../config/db");

exports.getHistory = async (req, res) => {
  const user_id = req.user.user_id;
  if (!user_id) return res.status(401).json({message: "Id undefined"});
  try {
    const userHistory = await pool.query(
      "SELECT * FROM result_history WHERE user_id = $1",
      [user_id]
    );
    if (!userHistory || userHistory.length === 0) {
      return res
        .status(404)
        .json({message : "There's no history. Try analyze some images!"});
    }
    res.status(200).json(userHistory.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({message : "Server error"});
  }
};

exports.getHistoryById = async (req, res) => {
  const user_id = req.user.user_id;
  const history_id = req.params.history_id;

  if (!user_id || !history_id) {
    return res.status(401).json({ message: "Id tidak lengkap." });
  }

  try {
    const queryText = `
      SELECT
        h.history_id, h.image_url, h.prediction_result, h.created_at, h.user_id, h.recycle_id,
        r.material_type, r.can_be_recycled, r.recycle_process, r.possible_products
      FROM
        result_history h
      LEFT JOIN 
        recycle_info r ON h.recycle_id = r.recycle_id
      WHERE
        h.user_id = $1 AND h.history_id = $2;
    `;

    const historyResult = await pool.query(queryText, [user_id, history_id]);

    if (historyResult.rows.length === 0) {
      return res
        .status(404)
        .json({
          message:
            "History not found or you do not have permission to view it.",
        });
    }

    res.status(200).json(historyResult.rows[0]);
  } catch (err) {
    console.error("Error fetching history detail:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.uploadPredictionResult = async (req, res) => {
  try {
    const { prediction_result } = req.body;
    const user_id = req.user.user_id;

    if (!image_url || !prediction_result) {
      return res
        .status(400)
        .json({ message: "prediction_result wajib diisi." });
    }

    const recyclingInfoQuery = await pool.query(
      `SELECT * FROM recycle_info WHERE material_type = $1`,
      [prediction_result]
    );

    if (recyclingInfoQuery.rows.length === 0) {
      return res
        .status(404)
        .json({
          message: "Tidak ada informasi daur ulang untuk hasil prediksi ini.",
        });
    }

    const info = recyclingInfoQuery.rows[0];

    await pool.query(
      `INSERT INTO result_history (prediction_result, user_id, recycle_id)
       VALUES ($1, $2, $3)`,
      [prediction_result, user_id, info.recycle_id]
    );

    return res.status(201).json({
      message: "Data hasil prediksi berhasil disimpan ke history.",
      image_url,
      prediction_result,
      recycle_info: info,
    });
  } catch (err) {
    console.error("Error in uploadPredictionResult:", err.message);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
}
