const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const fs = require('fs');

app.use(cors());
app.use(express.json());

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

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

// ดึงรายการห้องสอบที่ว่าง ผ่านแล้ว
app.get('/available-examrooms', (req, res) => {
  db.query(
    `SELECT er.room_id, er.room_name, er.total_seats, 
            GROUP_CONCAT(c.seat_number) AS booked_seats
     FROM examroom er 
     LEFT JOIN candidate c ON er.room_id = c.selected_room_id 
     GROUP BY er.room_id`,
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error fetching available exam rooms', error: err.message });
      }

      // แปลงข้อมูลให้คืนที่นั่งที่ยังว่าง
      const formattedResults = results.map(room => {
        const totalSeats = room.total_seats;
        const bookedSeats = room.booked_seats ? room.booked_seats.split(',').map(Number) : [];

        // หาที่นั่งที่ยังว่าง
        const availableSeats = [];
        for (let i = 1; i <= totalSeats; i++) {
          if (!bookedSeats.includes(i)) {
            availableSeats.push(i);
          }
        }

        return {
          room_id: room.room_id,
          room_name: room.room_name,
          total_seats: totalSeats,
          available_seats_count: availableSeats.length,
          available_seats: availableSeats, // เพิ่มข้อมูลที่นั่งว่าง
        };
      });

      res.json(formattedResults);
    }
  );
});


// ในส่วนของการลงทะเบียน ผ่านแล้ว
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

  // แปลง seat_number เป็น integer
  const seatNum = parseInt(seat_number);

  // เพิ่มการตรวจสอบค่า seat_number
  if (isNaN(seatNum) || seatNum <= 0) {
    return res.status(400).json({ message: 'Invalid seat number' });
  }

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

      // เพิ่มการตรวจสอบว่าเลขที่นั่งไม่เกินจำนวนที่นั่งทั้งหมด
      if (seatNum > total_seats) {
        return res.status(400).json({ 
          message: `Invalid seat number. This room has only ${total_seats} seats.` 
        });
      }

      if (booked_seats >= total_seats) {
        return res.status(400).json({ message: 'No available seats in this room' });
      }

      // ตรวจสอบเลขที่นั่งซ้ำ
      db.query(
        'SELECT * FROM candidate WHERE selected_room_id = ? AND seat_number = ?',
        [selected_room_id, seatNum],
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
            [first_name, last_name, university, email, phone, selected_room_id, seatNum],
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

// เพิ่ม endpoint สำหรับค้นหาการจองด้วยเบอร์โทรศัพท์
app.get('/check-booking/:phone', (req, res) => {
  db.query(
    `SELECT c.*, er.room_name, er.exam_date, er.exam_time 
     FROM candidate c 
     JOIN examroom er ON c.selected_room_id = er.room_id 
     WHERE c.phone = ?`,
    [req.params.phone],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error checking booking', error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลการจอง' });
      }
      res.json(results[0]);
    }
  );
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`User server running on port ${PORT}`);
});