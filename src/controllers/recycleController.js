const pool = require('../config/db');

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
