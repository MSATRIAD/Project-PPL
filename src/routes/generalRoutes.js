const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const recycleController = require('../controllers/recycleController');
const historyController = require('../controllers/historyController')

router.get('/articles', articleController.getArticles);
router.post('/recycling-info', recycleController.getRecyclingInfo);
router.get('/history', historyController.getHistory);
router.get('/historyById', historyController.getHistoryById);

module.exports = router;
