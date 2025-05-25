const express = require('express');
const router = express.Router();
const { uploadProfile, uploadPredict } = require("../middlewares/upload");
const articleController = require('../controllers/articleController');
const historyController = require('../controllers/historyController');
const profileController = require('../controllers/profileController');
const recycleController = require('../controllers/recycleController');


router.get('/articles', articleController.getArticles);
router.get('/history', historyController.getHistory);
router.get('/historyById', historyController.getHistoryById);
router.get('/users/:user_id', profileController.getProfile);
router.put('/users/edit/:user_id', profileController.editProfile);
router.delete('/users/:user_id', profileController.deleteProfile);
router.post(
  '/users/upload-profile',
  uploadProfile.single('profile_picture'), 
  profileController.uploadProfilePicture
);
router.post(
  "/recycling-predict",
  uploadPredict.single("file"),
  recycleController.getRecyclePredict
);

module.exports = router;
