let examRooms = [];
const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
const form = document.getElementById('bookingForm');

// ฟังก์ชันตรวจสอบความถูกต้องของฟอร์ม
function validateForm() {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    const formErrors = document.getElementById('formErrors');
    
    requiredFields.forEach(field => {
        if (!field.value) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
            
            // ตรวจสอบรูปแบบอีเมล
            if (field.type === 'email') {
                const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailPattern.test(field.value)) {
                    field.classList.add('is-invalid');
                    isValid = false;
                }
            }
            
            // ตรวจสอบรูปแบบเบอร์โทรศัพท์
            if (field.id === 'phone') {
                const phonePattern = /^[0-9]{10}$/;
                if (!phonePattern.test(field.value)) {
                    field.classList.add('is-invalid');
                    isValid = false;
                }
            }
        }
    });

    formErrors.style.display = isValid ? 'none' : 'block';
    return isValid;
}

async function checkBooking() {
    const phone = document.getElementById('searchPhone').value;
    if (!phone) {
        alert('กรุณากรอกเบอร์โทรศัพท์');
        return;
    }

    try {
        const response = await fetch(`http://localhost:5001/check-booking/${phone}`);
        const result = await response.json();

        const bookingResult = document.getElementById('bookingResult');
        const bookingDetails = document.getElementById('bookingDetails');

        if (response.ok) {
            bookingDetails.innerHTML = `
                <p><strong>ชื่อ-นามสกุล:</strong> ${result.first_name} ${result.last_name}</p>
                <p><strong>มหาวิทยาลัย:</strong> ${result.university}</p>
                <p><strong>ห้องสอบ:</strong> ${result.room_name}</p>
                <p><strong>ที่นั่ง:</strong> ${result.seat_number}</p>
                <p><strong>วันที่สอบ:</strong> ${result.exam_date}</p>
                <p><strong>เวลาสอบ:</strong> ${result.exam_time}</p>
            `;
            bookingResult.style.display = 'block';
        } else {
            bookingDetails.innerHTML = `<p class="text-danger">${result.message}</p>`;
            bookingResult.style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking booking:', error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบการจอง');
    }
}

// โหลดข้อมูลห้องสอบ
window.addEventListener('load', async () => {
    try {
        const response = await fetch('http://localhost:5001/available-examrooms');
        examRooms = await response.json();
        
        const roomSelect = document.getElementById('roomSelect');
        examRooms.forEach(room => {
            if (room.available_seats_count > 0) {
                const option = document.createElement('option');
                option.value = room.room_id;
                option.textContent = `${room.room_name} (ที่นั่งว่าง: ${room.available_seats_count})`;
                roomSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading exam rooms:', error);
    }
});

// อัพเดตที่นั่ง
document.getElementById('roomSelect').addEventListener('change', function() {
    const seatSelect = document.getElementById('seatSelect');
    seatSelect.innerHTML = '<option value="">กรุณาเลือกที่นั่ง</option>';
    
    if (this.value) {
        const room = examRooms.find(r => r.room_id === parseInt(this.value));
        if (room) {
            room.available_seats.forEach(seat => {
                const option = document.createElement('option');
                option.value = seat;
                option.textContent = `ที่นั่งหมายเลข ${seat}`;
                seatSelect.appendChild(option);
            });
            seatSelect.disabled = false;
        }
    } else {
        seatSelect.disabled = true;
    }
});

// จัดการการส่งฟอร์ม
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const phone = document.getElementById('phone').value;
    try {
        const checkResponse = await fetch(`http://localhost:5001/check-booking/${phone}`);
        if (checkResponse.ok) {
            alert('เบอร์โทรศัพท์นี้ได้ทำการจองไว้แล้ว');
            return;
        }
    } catch (error) {
        console.error('Error checking existing booking:', error);
    }

    const formData = {
        first_name: document.getElementById('title').value + document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        university: document.getElementById('university').value,
        email: document.getElementById('email').value,
        phone: phone,
        selected_room_id: parseInt(document.getElementById('roomSelect').value),
        seat_number: parseInt(document.getElementById('seatSelect').value)
    };

    try {
        const response = await fetch('http://localhost:5001/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('modalMessage').textContent = 'จองห้องสอบสำเร็จ';
            document.getElementById('bookingForm').reset();
            // รีเซ็ตสถานะการตรวจสอบของฟอร์ม
            const invalidFields = form.querySelectorAll('.is-invalid');
            invalidFields.forEach(field => field.classList.remove('is-invalid'));
            document.getElementById('formErrors').style.display = 'none';
            document.getElementById('seatSelect').disabled = true;
        } else {
            document.getElementById('modalMessage').textContent = `เกิดข้อผิดพลาด: ${result.message}`;
        }
        
        resultModal.show();
    } catch (error) {
        console.error('Error submitting form:', error);
        document.getElementById('modalMessage').textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
        resultModal.show();
    }
});

// เพิ่มการตรวจสอบข้อมูลแบบ Real-time
document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', function() {
        if (this.value) {
            this.classList.remove('is-invalid');
            if (document.querySelectorAll('.is-invalid').length === 0) {
                document.getElementById('formErrors').style.display = 'none';
            }
        }
    });
});