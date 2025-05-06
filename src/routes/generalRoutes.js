const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const recycleController = require('../controllers/recycleController');
const historyController = require('../controllers/historyController');
const profileController = require('../controllers/profileController');

router.get('/articles', articleController.getArticles);
router.post('/recycling-info', recycleController.getRecyclingInfo);
router.post('/recycling-predict', recycleController.getRecyclePredict);
router.get('/history', historyController.getHistory);
router.get('/historyById', historyController.getHistoryById);
router.get('/users/:id', profileController.getProfile);
router.put('/users/edit/:id', profileController.editProfile);
router.delete('/users/:id', profileController.deleteProfile);
router.post('/users/upload-profile',profileController.uploadProfilePicture);

module.exports = router;
