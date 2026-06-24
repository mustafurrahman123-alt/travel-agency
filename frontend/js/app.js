// Common frontend functions

// Include config if needed
// (config.js must be loaded before this file in HTML)

// Example: fetch users
async function fetchUsers() {
  const token = localStorage.getItem('adminToken');
  if (!token) return;

  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data;
}
// Add other functions as needed
