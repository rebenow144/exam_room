// app.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// เพิ่ม CORS middleware
app.use(cors());
app.use(express.json());
// เชื่อมต่อฐานข้อมูล
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1980',
  database: 'exam_booking_system',
  port: 3307
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

// สร้างห้องสอบใหม่
app.post('/examrooms', (req, res) => {
  const { room_name, total_seats, exam_date, exam_time } = req.body;
  
  db.query(
    'INSERT INTO examroom (room_name, total_seats, exam_date, exam_time) VALUES (?, ?, ?, ?)',
    [room_name, total_seats, exam_date, exam_time],
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error creating exam room', error: err.message });
      }
      res.status(201).json({ message: 'Exam room created', id: result.insertId });
    }
  );
});

// ดึงรายการห้องสอบทั้งหมด
app.get('/examrooms', (req, res) => {
  db.query('SELECT * FROM examroom', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Error fetching exam rooms', error: err.message });
    }
    res.json(results);
  });
});

// ดึงข้อมูลห้องสอบตาม ID
app.get('/examrooms/:id', (req, res) => {
  db.query(
    'SELECT * FROM examroom WHERE room_id = ?',
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error fetching exam room', error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'Exam room not found' });
      }
      res.json(results[0]);
    }
  );
});

// อัพเดทข้อมูลห้องสอบ
app.put('/examrooms/:id', (req, res) => {
  const { room_name, total_seats, exam_date, exam_time } = req.body;
  
  db.query(
    'UPDATE examroom SET room_name = ?, total_seats = ?, exam_date = ?, exam_time = ? WHERE room_id = ?',
    [room_name, total_seats, exam_date, exam_time, req.params.id],
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error updating exam room', error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Exam room not found' });
      }
      res.json({ message: 'Exam room updated successfully' });
    }
  );
});

// ลบห้องสอบ
app.delete('/examrooms/:id', (req, res) => {
  db.query(
    'DELETE FROM examroom WHERE room_id = ?',
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error deleting exam room', error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Exam room not found' });
      }
      res.json({ message: 'Exam room deleted successfully' });
    }
  );
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});