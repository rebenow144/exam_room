const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

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

// ดึงรายการห้องสอบที่ว่าง
app.get('/available-examrooms', (req, res) => {
  db.query(
    `SELECT er.*, 
     COUNT(c.candidate_id) as booked_seats,
     (er.total_seats - COUNT(c.candidate_id)) as available_seats
     FROM examroom er 
     LEFT JOIN candidate c ON er.room_id = c.selected_room_id 
     GROUP BY er.room_id 
     HAVING available_seats > 0`,
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error fetching available exam rooms', error: err.message });
      }
      res.json(results);
    }
  );
});

// สมัครสอบและจองที่นั่ง
app.post('/register', (req, res) => {
  const { 
    first_name, 
    last_name, 
    university,
    email,
    phone,
    selected_room_id,
    seat_number 
  } = req.body;

  // ตรวจสอบที่นั่งว่าง
  db.query(
    `SELECT er.total_seats, COUNT(c.candidate_id) as booked_seats
     FROM examroom er 
     LEFT JOIN candidate c ON er.room_id = c.selected_room_id 
     WHERE er.room_id = ? 
     GROUP BY er.room_id`,
    [selected_room_id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking availability', error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Exam room not found' });
      }

      const { total_seats, booked_seats } = results[0];
      if (booked_seats >= total_seats) {
        return res.status(400).json({ message: 'No available seats in this room' });
      }

      // ตรวจสอบเลขที่นั่งซ้ำ
      db.query(
        'SELECT * FROM candidate WHERE selected_room_id = ? AND seat_number = ?',
        [selected_room_id, seat_number],
        (err, seatResults) => {
          if (err) {
            return res.status(500).json({ message: 'Error checking seat number', error: err.message });
          }

          if (seatResults.length > 0) {
            return res.status(400).json({ message: 'This seat is already taken' });
          }

          // บันทึกข้อมูลผู้สมัคร
          db.query(
            `INSERT INTO candidate 
             (first_name, last_name, university, email, phone, selected_room_id, seat_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, university, email, phone, selected_room_id, seat_number],
            (err, result) => {
              if (err) {
                return res.status(500).json({ message: 'Error registering candidate', error: err.message });
              }
              res.status(201).json({ 
                message: 'Registration successful', 
                candidate_id: result.insertId 
              });
            }
          );
        }
      );
    }
  );
});

// ดูข้อมูลการจองของผู้สมัคร
app.get('/candidates/:candidateId', (req, res) => {
  db.query(
    `SELECT c.*, er.room_name, er.exam_date, er.exam_time 
     FROM candidate c 
     JOIN examroom er ON c.selected_room_id = er.room_id 
     WHERE c.candidate_id = ?`,
    [req.params.candidateId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching candidate info', error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      res.json(results[0]);
    }
  );
});

// ยกเลิกการจอง
app.delete('/candidates/:candidateId', (req, res) => {
  db.query(
    'DELETE FROM candidate WHERE candidate_id = ?',
    [req.params.candidateId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error canceling registration', error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      res.json({ message: 'Registration canceled successfully' });
    }
  );
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`User server running on port ${PORT}`);
});