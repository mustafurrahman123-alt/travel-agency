// js/app.js
// Common frontend functions

// --- 1. LOGIN HANDLER (for admin-login.html) ---
function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                localStorage.setItem('adminToken', data.token);
                alert('✅ Login successful!');
                window.location.href = 'admin-dashboard.html';
            } else {
                alert('❌ Invalid credentials. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('❌ Server error. Please try again later.');
        }
    });
}

// --- 2. FETCH USERS (for admin-dashboard.html) ---
async function fetchUsers() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = 'admin-login.html';
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            // Token expired
            localStorage.removeItem('adminToken');
            alert('Session expired. Please login again.');
            window.location.href = 'admin-login.html';
            return null;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Failed to fetch users:', error);
        return null;
    }
}

// --- 3. LOAD USERS INTO TABLE (dashboard only) ---
async function loadDashboardUsers() {
    // Check if we are on the dashboard page
    const tableBody = document.querySelector('.recent-activity tbody');
    if (!tableBody) return;

    const users = await fetchUsers();
    if (users && users.length > 0) {
        // Replace the hardcoded table rows with real data
        tableBody.innerHTML = users.map((user, index) => `
            <tr>
                <td>#${String(index + 1).padStart(3, '0')}</td>
                <td>${user.name || 'Unknown'}</td>
                <td>${user.destination || 'N/A'}</td>
                <td>${user.status || '✅ Confirmed'}</td>
            </tr>
        `).join('');
    } else if (users && users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No users found</td></tr>`;
    } else {
        // Keep the static placeholder data if API fails (optional)
        console.log('Using static fallback data');
    }
}

// --- 4. CHECK DASHBOARD AUTH (runs on page load) ---
function checkDashboardAuth() {
    if (!window.location.pathname.includes('admin-dashboard.html')) return;
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert('Please login to access the dashboard.');
        window.location.href = 'admin-login.html';
    }
}

// --- 5. RUN ON PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Travel Agency Frontend Loaded');

    // Run login setup
    setupLoginForm();

    // Protect dashboard
    checkDashboardAuth();

    // Load real data into dashboard table
    loadDashboardUsers();
});
