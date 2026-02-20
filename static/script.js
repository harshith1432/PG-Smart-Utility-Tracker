let currentUser = null;
let currentRoom = null;

const ICONS = {
    "Washing Machine": "🧺",
    "Bathroom": "🛁",
    "Geyser": "🔥",
    "Food": "🍱",
    "Water Can": "💧"
};

function handleLogin() {
    const name = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim();

    if (name && room) {
        currentUser = name;
        currentRoom = room;
        localStorage.setItem('pg_user', JSON.stringify({ name, room }));
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('user-display').classList.remove('hidden');
        document.getElementById('user-display').innerText = `Logged in as: ${name}`;
        fetchStatus();
        setInterval(fetchStatus, 10000);
    } else {
        alert("Please enter both Name and Room Number");
    }
}

// Auto-login from local storage
window.onload = () => {
    const saved = localStorage.getItem('pg_user');
    if (saved) {
        const { name, room } = JSON.parse(saved);
        currentUser = name;
        currentRoom = room;
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('user-display').classList.remove('hidden');
        document.getElementById('user-display').innerText = `Logged in as: ${name}`;
        fetchStatus();
        setInterval(fetchStatus, 10000);
    }
};

async function fetchStatus() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        renderDashboard(data);
    } catch (err) {
        console.error("Error fetching status:", err);
    }
}

function renderDashboard(utilities) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    utilities.forEach(util => {
        const card = document.createElement('div');
        card.className = 'card';

        let metaTxt = util.updated_by ? `Updated by ${util.updated_by}` : 'No recent updates';
        let actionBtn = '';
        let freeAtTxt = '';

        if (util.name === "Washing Machine") {
            if (util.status === "In Use") {
                const freeTime = new Date(util.free_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                freeAtTxt = `<div class="status-badge" style="background: rgba(129, 140, 248, 0.2); color: #818cf8; margin-left: 10px;">Free at ${freeTime}</div>`;
                actionBtn = `<button onclick="updateUtility('${util.name}', 'Free')">Reset</button>`;
            } else {
                actionBtn = `<button onclick="openWashingModal()">Use</button>`;
            }
        } else {
            // Toggles for others
            const nextStatus = getNextStatus(util.name, util.status);
            actionBtn = `<button class="${nextStatus === 'OFF' || nextStatus === 'Free' ? 'secondary' : ''}" onclick="updateUtility('${util.name}', '${nextStatus}')">Toggle</button>`;
        }

        const icon = ICONS[util.name] || "📦";

        card.innerHTML = `
            <div class="util-info">
                <div class="util-icon">${icon}</div>
                <div class="util-details">
                    <h3>${util.name} ${freeAtTxt}</h3>
                    <span class="status-badge status-${util.status.replace(' ', '-')}">${util.status}</span>
                    <div class="util-meta">${metaTxt}</div>
                </div>
            </div>
            <div class="actions">
                ${actionBtn}
            </div>
        `;
        dashboard.appendChild(card);
    });
}

function getNextStatus(name, current) {
    const map = {
        "Bathroom": current === "Free" ? "Occupied" : "Free",
        "Geyser": current === "OFF" ? "ON" : "OFF",
        "Food": current === "Available" ? "Finished" : "Available",
        "Water Can": current === "Full" ? "Empty" : "Full"
    };
    return map[name] || current;
}

async function updateUtility(name, status, duration = null) {
    try {
        const payload = {
            name: name,
            status: status,
            updated_by: `${currentUser} (Room ${currentRoom})`
        };
        if (duration) payload.duration = duration;

        const response = await fetch('/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const updated = await response.json();
        fetchStatus(); // Refresh all
    } catch (err) {
        console.error("Update failed:", err);
    }
}

function openWashingModal() {
    document.getElementById('duration-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('duration-modal').classList.add('hidden');
}

function confirmWashing() {
    const dur = document.getElementById('wash-duration').value;
    updateUtility('Washing Machine', 'In Use', dur);
    closeModal();
}

function logout() {
    localStorage.removeItem('pg_user');
    currentUser = null;
    currentRoom = null;
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('user-display').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('room').value = '';
}
