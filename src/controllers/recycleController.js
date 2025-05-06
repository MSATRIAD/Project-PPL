const axios = require('axios');
const FormData = require('form-data');
const pool = require("../config/db");

exports.getRecyclePredict = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send("File is required");
    }

    const form = new FormData();
    form.append("file", file.buffer, file.originalname);

    const modelResponse = await axios.post("routesModelDisini", form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const prediction = modelResponse.data.prediction;
    const image_url = modelResponse.data.file_url;
    const user_id = req.user.user_id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM prediction_logs 
       WHERE user_id = $1 
         AND prediction_result = $2 
         AND created_at BETWEEN $3 AND $4`,
      [user_id, prediction, todayStart, todayEnd]
    );

    const predictionCount = parseInt(countResult.rows[0].count);

    await pool.query(
      `INSERT INTO prediction_logs (user_id, prediction_result) VALUES ($1, $2)`,
      [user_id, prediction]
    );

    if (predictionCount < 5) {
      await pool.query(
        `UPDATE users SET exp = exp + 10 WHERE user_id = $1`,
        [user_id]
      );
    }

    await pool.query(
      `INSERT INTO result_history (image_url, prediction_result, user_id)
       VALUES ($1, $2, $3)`,
      [image_url, prediction, user_id]
    );

    const recyclingInfoQuery = await pool.query(
      `SELECT * FROM recycle_info WHERE material_type = $1`,
      [prediction]
    );

    if (recyclingInfoQuery.rows.length === 0) {
      return res.status(404).send("Tidak ada informasi daur ulang untuk hasil prediksi ini");
    }

    const info = recyclingInfoQuery.rows[0];

    return res.status(200).json({
      prediction: prediction,
      image_url: image_url,
      recycling_info: {
        possible_products: info.possible_products,
      },
    });

  } catch (err) {
    console.error("Error in getRecyclePredict:", err.message);
    res.status(500).send("Terjadi kesalahan saat memproses prediksi");
  }
};
