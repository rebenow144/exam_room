const API_URL = 'http://localhost:5000/examrooms';

async function loadExamRooms() {
    const response = await fetch(API_URL);
    const rooms = await response.json();
    const list = document.getElementById('examRoomList');
    list.innerHTML = '';
    rooms.forEach(room => {
        const formattedDate = room.exam_date.split("T")[0]; // ตัดเวลาทิ้ง
        list.innerHTML += `
            <tr>
                <td>${room.room_id}</td>
                <td>${room.room_name}</td>
                <td>${room.total_seats}</td>
                <td>${formattedDate}</td>
                <td>${room.exam_time}</td>
                <td>
                    <button class="btn btn-warning" onclick="openUpdateModal(${room.room_id}, '${room.room_name}', ${room.total_seats}, '${formattedDate}', '${room.exam_time}')">Update</button>
                    <button class="btn btn-danger" onclick="deleteRoom(${room.room_id})">Delete</button>
                </td>
            </tr>`;
    });
}

function openUpdateModal(id, name, seats, date, time) {
    document.getElementById('update_id').value = id;
    document.getElementById('update_room_name').value = name;
    document.getElementById('update_total_seats').value = seats;
    document.getElementById('update_exam_date').value = date.split("T")[0]; // ตัดเวลาทิ้ง
    const [startTime, endTime] = time.split('-');
    document.getElementById('update_exam_start_time').value = startTime;
    document.getElementById('update_exam_end_time').value = endTime;
    new bootstrap.Modal(document.getElementById('updateModal')).show();
}

async function saveUpdate() {
    const id = document.getElementById('update_id').value;
    const room_name = document.getElementById('update_room_name').value;
    const total_seats = document.getElementById('update_total_seats').value;
    const exam_date = document.getElementById('update_exam_date').value;
    const exam_start_time = document.getElementById('update_exam_start_time').value;
    const exam_end_time = document.getElementById('update_exam_end_time').value;
    
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_name, total_seats, exam_date, exam_time: `${exam_start_time}-${exam_end_time}` })
    });
    
    if (response.ok) {
        alert('Exam room updated successfully');
        loadExamRooms();
        bootstrap.Modal.getInstance(document.getElementById('updateModal')).hide();
    } else {
        alert('Failed to update exam room');
    }
}

document.addEventListener('DOMContentLoaded', loadExamRooms);
