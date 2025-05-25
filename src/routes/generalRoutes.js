const express = require('express');
const router = express.Router();

const articleController = require('../controllers/articleController');
const recycleController = require('../controllers/recycleController');
const historyController = require('../controllers/historyController');
const profileController = require('../controllers/profileController');

router.get('/articles', articleController.getArticles);

router.post(
  '/recycling-predict',
  uploadPredict.single('file'), 
  recycleController.getRecyclePredict
);

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

module.exports = router;
