const API_URL = 'http://localhost:5000';
let editModal;
let candidateModal;

document.addEventListener('DOMContentLoaded', () => {
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    candidateModal = new bootstrap.Modal(document.getElementById('candidateModal'));

    // Login Form Handler
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                loadExamRooms();
            } else {
                alert('เข้าสู่ระบบไม่สำเร็จ');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    });

    // Add Exam Room Form Handler
    document.getElementById('addExamRoomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomData = {
            room_name: document.getElementById('roomName').value,
            total_seats: document.getElementById('totalSeats').value,
            exam_date: document.getElementById('examDate').value,
            exam_time: document.getElementById('examTime').value
        };

        try {
            const response = await fetch(`${API_URL}/examrooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            });

            if (response.ok) {
                alert('เพิ่มห้องสอบสำเร็จ');
                document.getElementById('addExamRoomForm').reset();
                loadExamRooms();
            } else {
                alert('เกิดข้อผิดพลาดในการเพิ่มห้องสอบ');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    });

    // Save Edit Handler
    document.getElementById('saveEdit').addEventListener('click', async () => {
        const roomId = document.getElementById('editRoomId').value;
        const roomData = {
            room_name: document.getElementById('editRoomName').value,
            total_seats: document.getElementById('editTotalSeats').value,
            exam_date: document.getElementById('editExamDate').value,
            exam_time: document.getElementById('editExamTime').value
        };

        try {
            const response = await fetch(`${API_URL}/examrooms/${roomId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            });

            if (response.ok) {
                alert('อัพเดทข้อมูลสำเร็จ');
                editModal.hide();
                loadExamRooms();
            } else {
                alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    });
});

// Load Exam Rooms
async function loadExamRooms() {
    try {
        const response = await fetch(`${API_URL}/examrooms`);
        const rooms = await response.json();
        const tbody = document.getElementById('examRoomsList');
        tbody.innerHTML = '';

        rooms.forEach(room => {
            const row = `
                <tr>
                    <td>${room.room_name}</td>
                    <td>${room.total_seats}</td>
                    <td>
                        <span class="badge bg-info">${room.booked_seats || 0}</span>
                    </td>
                    <td>${formatDate(room.exam_date)}</td>
                    <td>${room.exam_time}</td>
                    <td>
                        <button class="btn btn-sm btn-info me-2" onclick="viewCandidates(${room.room_id})">
                            <i class="fas fa-users"></i> ดูรายชื่อ
                        </button>
                        <button class="btn btn-sm btn-primary me-2" onclick="editRoom(${room.room_id})">
                            <i class="fas fa-edit"></i> 
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id})">
                            <i class="fas fa-trash"></i> 
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// View candidates in a room
async function viewCandidates(roomId) {
    try {
        const response = await fetch(`${API_URL}/examrooms/${roomId}/candidates`);
        const candidates = await response.json();
        
        const candidateList = document.getElementById('candidateList');
        candidateList.innerHTML = '';
        
        candidates.forEach(candidate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${candidate.first_name} ${candidate.last_name}</td>
                <td>${candidate.university}</td>
                <td>${candidate.email}</td>
                <td>${candidate.phone}</td>
                <td>${candidate.seat_number}</td>
            `;
            candidateList.appendChild(row);
        });
        
        candidateModal.show();
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้สอบ');
    }
}


// Edit Room
async function editRoom(roomId) {
    try {
        const response = await fetch(`${API_URL}/examrooms`);
        const rooms = await response.json();
        const room = rooms.find(r => r.room_id === roomId);

        document.getElementById('editRoomId').value = roomId;
        document.getElementById('editRoomName').value = room.room_name;
        document.getElementById('editTotalSeats').value = room.total_seats;
        document.getElementById('editExamDate').value = formatDateForInput(room.exam_date);
        document.getElementById('editExamTime').value = room.exam_time;

        editModal.show();
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// Delete Room
async function deleteRoom(roomId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบห้องสอบนี้?')) {
        try {
            const response = await fetch(`${API_URL}/examrooms/${roomId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('ลบห้องสอบสำเร็จ');
                loadExamRooms();
            } else {
                alert('เกิดข้อผิดพลาดในการลบห้องสอบ');
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}