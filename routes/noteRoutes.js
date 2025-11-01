// routes/noteRoutes.js
const express = require('express');
const router = express.Router();
const {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getArchivedNotes,
  deleteArchivedNote,
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

// Apply the 'protect' middleware to all routes in this file
router.use(protect);

router.route('/').get(getNotes).post(createNote);
router.get('/archive', getArchivedNotes);
router.delete('/archive/:id', deleteArchivedNote);
router.route('/:id').put(updateNote).delete(deleteNote);

module.exports = router;