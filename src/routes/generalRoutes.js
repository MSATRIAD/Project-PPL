const express = require('express');
const router = express.Router();
const { uploadProfile, uploadPredict } = require("../middlewares/upload");
const articleController = require('../controllers/articleController');
const historyController = require('../controllers/historyController');
const profileController = require('../controllers/profileController');
const recycleController = require('../controllers/recycleController');


router.get('/articles', articleController.getArticles);
router.get('/history', historyController.getHistory);
router.get('/history/:history_id', historyController.getHistoryById);
router.post('/upload', historyController.uploadPredictionResult);
router.get('/profile', profileController.getProfile);
router.get('/rewards', profileController.getAllRewards);
router.post('/redeem', profileController.redeemReward);
router.get("/rewards/my", profileController.getMyRedeemedRewards);
router.put('/profile/edit', profileController.editProfile);
router.delete('/users/:user_id', profileController.deleteProfile);
router.post(
  '/profile/upload',
  uploadProfile.single('profile_picture'), 
  profileController.uploadProfilePicture
);
router.post(
  "/recycling-predict",
  uploadPredict.single("file"),
  recycleController.getRecyclePredict
);

module.exports = router;
