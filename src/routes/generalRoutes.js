const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const recycleController = require('../controllers/recycleController');

router.get('/articles', articleController.getArticles);
router.post('/recycling-info', recycleController.getRecyclingInfo);

module.exports = router;
