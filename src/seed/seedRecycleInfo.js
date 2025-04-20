const pool = require('../config/db'); // pastikan path-nya benar

async function seedRecycleData() {
  const data = [
    {
      material_type: 'Plastic',
      can_be_recycled: true,
      recycle_process: 'Bersihkan dari sisa makanan atau cairan, pisahkan berdasarkan jenis plastik, kemudian dicacah dan dilelehkan untuk dibentuk ulang.',
      possible_products: 'Tas belanja, botol plastik baru, ember, pot tanaman, dan peralatan rumah tangga.'
    },
    {
      material_type: 'Kertas dan Kardus',
      can_be_recycled: true,
      recycle_process: 'Pisahkan dari bahan lain, sobek menjadi potongan kecil, direndam dan diolah menjadi bubur kertas untuk dicetak ulang.',
      possible_products: 'Kertas daur ulang, karton, tisu, dan kertas bungkus.'
    },
    {
      material_type: 'Kaca',
      can_be_recycled: true,
      recycle_process: 'Dipilah berdasarkan warna, dibersihkan, dihancurkan menjadi pecahan kecil (cullet), dan dilelehkan untuk dibentuk ulang.',
      possible_products: 'Botol kaca baru, ubin kaca, bahan bangunan, dan barang dekoratif.'
    },
    {
      material_type: 'Metal',
      can_be_recycled: true,
      recycle_process: 'Dikumpulkan, dibersihkan dari bahan lain, dilelehkan, dan dibentuk kembali menjadi lembaran atau bentuk baru.',
      possible_products: 'Kaleng baru, suku cadang kendaraan, komponen elektronik, dan peralatan rumah tangga.'
    },
    {
      material_type: 'Limbah Organik',
      can_be_recycled: true,
      recycle_process: 'Dikumpulkan dan difermentasi melalui proses kompos atau biogas untuk menghasilkan pupuk atau energi.',
      possible_products: 'Kompos (pupuk alami), biogas, dan media tanam.'
    },
    {
      material_type: 'Tekstil',
      can_be_recycled: true,
      recycle_process: 'Diklasifikasi berdasarkan jenis kain, diproses ulang dengan cara pemintalan ulang atau dihancurkan menjadi serat.',
      possible_products: 'Lap kain, bahan isolasi, karpet, pakaian daur ulang, dan tas.'
    }
  ]

  for (const item of data) {
    await pool.query(
      `INSERT INTO recycle_info (material_type, can_be_recycled, recycle_process, possible_products)
       VALUES ($1, $2, $3, $4)`,
      [item.material_type, item.can_be_recycled, item.recycle_process, item.possible_products]
    );
  }

  console.log('seeded successfully!');
  process.exit();
}

seedRecycleData().catch(err => {
  console.error('Failed to seed :', err);
  process.exit(1);
});