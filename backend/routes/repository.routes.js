const express = require('express');
const router = express.Router();
const controller = require('../controllers/repository.controller');

router.post('/analyze', controller.analyze);
router.get('/:id', controller.getRepository);
router.get('/:id/tree', controller.getTree);
router.get('/:id/dependencies', controller.getDependencies);
router.get('/:id/summary', controller.getSummary);
router.get('/:id/documentation', controller.getDocumentation);
router.get('/:id/file', controller.getFileExplanationHandler);

module.exports = router;
