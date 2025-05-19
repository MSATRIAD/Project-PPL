const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile_pictures');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const articleController = require('../controllers/articleController');
const recycleController = require('../controllers/recycleController');
const historyController = require('../controllers/historyController');
const profileController = require('../controllers/profileController');

router.get('/articles', articleController.getArticles);
//router.post('/recycling-info', recycleController.getRecyclingInfo);
router.post('/recycling-predict', recycleController.getRecyclePredict);
router.get('/history', historyController.getHistory);
router.get('/historyById', historyController.getHistoryById);
router.get('/users/:user_id', profileController.getProfile);
router.put('/users/edit/:user_id', profileController.editProfile);
router.delete('/users/:user_id', profileController.deleteProfile);
router.post(
  '/users/upload-profile',
  upload.single('profile_picture'),
  profileController.uploadProfilePicture
);

module.exports = router;
