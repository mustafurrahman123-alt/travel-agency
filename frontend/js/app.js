// js/app.js
// Common frontend functions

// --- 1. LOGIN HANDLER (Frontend-only demo for now) ---
function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Since your backend doesn't have an /auth/login yet,
        // we use a simple hardcoded check to demo the dashboard.
        // ⚠️ REPLACE this with real backend auth later!
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('adminToken', 'dummy-token-for-demo');
            alert('✅ Login successful!');
            window.location.href = 'admin-dashboard.html';
        } else {
            alert('❌ Invalid credentials. Use admin / admin123');
        }
    });
}

// --- 2. FETCH FLIGHTS (Matches your backend route) ---
async function fetchFlights() {
    try {
        const response = await fetch(`${API_BASE_URL}/flights`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Failed to fetch flights:', error);
        return null;
    }
}

// --- 3. FETCH BOOKINGS (Matches your backend route) ---
async function fetchBookings() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        console.warn('No token found');
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            alert('Session expired. Please login again.');
            window.location.href = 'admin-login.html';
            return null;
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Failed to fetch bookings:', error);
        return null;
    }
}

// --- 4. LOAD FLIGHTS ON HOMEPAGE ---
async function loadHomepageFlights() {
    const grid = document.querySelector('.card-grid');
    if (!grid) return;

    const flights = await fetchFlights();
    if (flights && flights.length > 0) {
        grid.innerHTML = flights.map(f => `
            <div class="card">
                ✈️ ${f.destination || 'Unknown'}
                <span>$${f.price || '0'}</span>
                <small>${f.airline || 'N/A'}</small>
            </div>
        `).join('');
    } else {
        // Fallback to static content if API fails
        console.log('Using static fallback destinations');
    }
}

// --- 5. LOAD BOOKINGS ON DASHBOARD ---
async function loadDashboardBookings() {
    const tableBody = document.querySelector('.recent-activity tbody');
    if (!tableBody) return;

    const bookings = await fetchBookings();
    if (bookings && bookings.length > 0) {
        tableBody.innerHTML = bookings.map((b, index) => `
            <tr>
                <td>#${String(index + 1).padStart(3, '0')}</td>
                <td>${b.customer_name || 'Unknown'}</td>
                <td>${b.destination || 'N/A'}</td>
                <td>${b.status || '✅ Confirmed'}</td>
            </tr>
        `).join('');
    } else if (bookings && bookings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No bookings found</td></tr>`;
    }
}

// --- 6. PROTECT DASHBOARD ---
function checkDashboardAuth() {
    if (!window.location.pathname.includes('admin-dashboard.html')) return;
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert('Please login to access the dashboard.');
        window.location.href = 'admin-login.html';
    }
}

// --- 7. RUN ON PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Travel Agency Frontend Loaded');
    console.log('🔗 Connected to:', API_BASE_URL);

    // Login page
    setupLoginForm();

    // Dashboard protection
    checkDashboardAuth();

    // Homepage: Load flights
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadHomepageFlights();
    }

    // Dashboard: Load bookings
    if (window.location.pathname.includes('admin-dashboard.html')) {
        loadDashboardBookings();
    }
});
