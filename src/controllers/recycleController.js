const pool = require("../config/db");

exports.getRecyclingInfo = async (req, res) => {
  try {
    const { materialType } = req.body; 

    const result = await pool.query(
      `SELECT * FROM recycle_info WHERE material_type = $1`,
      [materialType]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Tidak ada Infromasi Daur Ulang mengenai sampah ini");
    }

    const recyclingInfo = result.rows[0];
    res.json({
      material_type: recyclingInfo.material_type,
      can_be_recycled: recyclingInfo.can_be_recycled,
      recycle_process: recyclingInfo.recycle_process,
      possible_products: recyclingInfo.possible_products,
    });
  } catch (err) {
    console.error('Error retrieving recycling info:', err.message);
    res.status(500).send("Error retrieving recycling information");
  }
};

exports.getRecyclePredict = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(404).send("File is required");
    }

    const form = new FormData();
    form.append("file", file.buffer, file.originalname);

    const modelResponse = await axios.post("routesModelDisini", form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const prediction_id = modelResponse.data.prediction;
    const predictionResult = await pool.query(
      "SELECT * FROM recycle_info WHERE prediction_id = $1",
      [prediction_id]
    );

    const { predict } = predictionResult;
    const image_url = modelResponse.data.file_url;
    const prediction_result = predict;
    const user_id = req.user.user_id;

    const saved = await pool.query(
      `INSERT INTO result_history (image_url, prediction_result, user_id)
       VALUES ($1, $2, $3)`,
      [image_url, prediction_result, user_id]
    );
    if (saved) {
      return res
        .status(201)
        .send(
          "Here's the analyze result. Analyze Result has been saved to your history",
          predictionResult
        );
    }
  } catch (err) {
    console.error("Error retrieving recycling info:", err.message);
    res.status(500).send("Error retrieving recycling information");
  }
};
