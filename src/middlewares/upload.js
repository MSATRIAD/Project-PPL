const multer = require('multer');
const path = require('path');

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile_pictures');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const uploadProfile = multer({ storage: profileStorage });
const uploadPredict = multer({ storage: multer.memoryStorage() });

module.exports = {
  uploadProfile,
  uploadPredict,
};
