// API Configuration
const API_URL = 'https://ravel-agency-backend.onrender.com/api';

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', function() {
    loadPackages();
    setupContactForm();
});

// Load packages from API
async function loadPackages() {
    const container = document.getElementById('packages-container');
    if (!container) {
        console.log('Container not found');
        return;
    }
    
    try {
        // Show loading spinner
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"></div></div>';
        
        // Fetch packages
        const response = await fetch(API_URL + '/packages');
        
        if (!response.ok) {
            throw new Error('Failed to fetch packages');
        }
        
        const packages = await response.json();
        
        if (!packages || packages.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p>No packages available</p></div>';
            return;
        }
        
        // Display packages
        let html = '';
        for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i];
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="package-card">
                        <img src="${pkg.image_url}" alt="${pkg.title}" style="width:100%; height:250px; object-fit:cover">
                        <div class="card-body">
                            <h4>${pkg.title}</h4>
                            <p class="text-muted">${pkg.destination}</p>
                            <p>${pkg.description.substring(0, 100)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="package-price">$${pkg.price}</span>
                                <span class="package-duration"><i class="far fa-clock"></i> ${pkg.duration} days</span>
                            </div>
                            <button class="btn btn-primary mt-3 w-100" onclick="bookPackage(${pkg.id}, '${pkg.title}')">
                                Book Now <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading packages:', error);
        container.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Failed to load packages. Please refresh the page.</p></div>';
    }
}

// Book package function
function bookPackage(packageId, packageTitle) {
    const name = prompt('Enter your name:');
    if (!name) return;
    
    const email = prompt('Enter your email:');
    if (!email) return;
    
    const travelDate = prompt('Enter travel date (YYYY-MM-DD):');
    if (!travelDate) return;
    
    // Make booking
    fetch(API_URL + '/bookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            package_id: packageId,
            customer_name: name,
            customer_email: email,
            travel_date: travelDate
        })
    })
    .then(function(response) {
        if (response.ok) {
            alert('Booking confirmed for ' + packageTitle + '! We\'ll contact you soon.');
        } else {
            alert('Booking failed. Please try again.');
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        alert('Booking failed. Please try again.');
    });
}

// Setup contact form
function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        fetch(API_URL + '/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                message: message
            })
        })
        .then(function(response) {
            if (response.ok) {
                alert('Message sent successfully!');
                form.reset();
            } else {
                alert('Failed to send message.');
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            alert('Failed to send message.');
        });
    });
}

// Function to scroll to packages
function scrollToPackages() {
    const packagesSection = document.getElementById('packages');
    if (packagesSection) {
        packagesSection.scrollIntoView({ behavior: 'smooth' });
    }
}
