// controllers/noteController.js
const { pool } = require('../config/db');

// @desc    Get all notes for a user
// @route   GET /api/notes
const getNotes = async (req, res) => {
  try {
    const [notes] = await pool.query(
      'SELECT id as _id, title, content, created_at as createdAt FROM notes WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new note
// @route   POST /api/notes
const createNote = async (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user.id;

  try {
    const [result] = await pool.query(
      'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
      [user_id, title || '', content || '']
    );

    const insertId = result.insertId;

    // Fetch the newly created note to return it
    const [newNote] = await pool.query(
      'SELECT id as _id, title, content, created_at as createdAt FROM notes WHERE id = ?',
      [insertId]
    );

    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a note
// @route   PUT /api/notes/:id
const updateNote = async (req, res) => {
  const { title, content } = req.body;
  const noteId = req.params.id;
  const user_id = req.user.id;

  try {
    // Check if the note exists and belongs to the user
    const [notes] = await pool.query(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [noteId, user_id]
    );
    
    if (notes.length === 0) {
      return res.status(404).json({ message: 'Note not found or not authorized' });
    }

    // Update the note
    await pool.query(
      'UPDATE notes SET title = ?, content = ? WHERE id = ?',
      [title, content, noteId]
    );

    // Fetch and return the updated note
    const [updatedNote] = await pool.query(
      'SELECT id as _id, title, content, created_at as createdAt FROM notes WHERE id = ?',
      [noteId]
    );

    res.json(updatedNote[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a note (move to archive)
// @route   DELETE /api/notes/:id
const deleteNote = async (req, res) => {
  const noteId = req.params.id;
  const user_id = req.user.id;

  try {
    // Get the note first
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [noteId, user_id]
    );
    const note = rows[0];
    if (!note) {
      return res.status(404).json({ message: 'Note not found or not authorized' });
    }

    // Insert into archive
    await pool.query(
      'INSERT INTO archived_notes (user_id, title, content, created_at) VALUES (?, ?, ?, ?)',
      [user_id, note.title || '', note.content || '', note.created_at]
    );

    // Delete from active notes
    await pool.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, user_id]);

    res.json({ message: 'Note archived' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get archived notes
// @route   GET /api/notes/archive
const getArchivedNotes = async (req, res) => {
  try {
    const [notes] = await pool.query(
      'SELECT id as _id, title, content, archived_at as archivedAt, created_at as createdAt FROM archived_notes WHERE user_id = ? ORDER BY archived_at DESC',
      [req.user.id]
    );
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Permanently delete an archived note
// @route   DELETE /api/notes/archive/:id
const deleteArchivedNote = async (req, res) => {
  const noteId = req.params.id;
  const user_id = req.user.id;
  try {
    const [result] = await pool.query('DELETE FROM archived_notes WHERE id = ? AND user_id = ?', [noteId, user_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Archived note not found or not authorized' });
    }
    res.json({ message: 'Archived note permanently deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getArchivedNotes,
  deleteArchivedNote,
};