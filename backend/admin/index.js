const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const fs = require('fs');

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
  user: '2SFr66t913atmzV.root',
  password: 'CnxAk3t7YePPLoaz',
  database: 'exam_booking_system',
  port: 4000,
  ssl: {
    ca: fs.readFileSync('../backend/isrgrootx1.pem')
  }

});

// เพิ่ม error handling ที่ละเอียดขึ้น
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    console.error('Connection config:', {
      host: db.config.host,
      user: db.config.user,
      database: db.config.database,
      port: db.config.port
    });
    return;
  }
  console.log('Connected to database successfully');
});

// Admin Login ผ่านแล้ว
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password }); // เพิ่มบรรทัดนี้ก
  
  db.query(
    'SELECT admin_id, first_name, last_name FROM admin WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) {
        console.error('Query error:', err); // เพิ่มบรรทัดนี้
        return res.status(500).json({ message: 'Error during login', error: err.message });
      }
      console.log('Query results:', results); // เพิ่มบรรทัดนี้
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      res.json(results[0]);
    }
  );
});

// สร้างห้องสอบใหม่ ผ่านแล้ว
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

// ดึงรายการห้องสอบทั้งหมด ผ่านแล้ว
app.get('/examrooms', (req, res) => {
  db.query(
    `SELECT er.*, 
     COUNT(c.candidate_id) as booked_seats 
     FROM examroom er 
     LEFT JOIN candidate c ON er.room_id = c.selected_room_id 
     GROUP BY er.room_id`,
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error fetching exam rooms', error: err.message });
      }
      res.json(results);
    }
  );
});

// ดูรายชื่อผู้สมัครสอบในแต่ละห้อง ผ่านแล้ว
app.get('/examrooms/:roomId/candidates', (req, res) => {
  db.query(
    `SELECT c.* FROM candidate c 
     WHERE c.selected_room_id = ?`,
    [req.params.roomId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error fetching candidates', error: err.message });
      }
      res.json(results);
    }
  );
});

// อัพเดทข้อมูลห้องสอบ ผ่านแล้ว
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

// ลบห้องสอบ ผ่านแล้ว
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
  console.log(`Admin server running on port ${PORT}`);
});