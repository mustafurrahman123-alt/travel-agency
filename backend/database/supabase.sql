-- Create packages table
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    travel_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create contacts table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admins (email, password) VALUES 
('admin@travelease.com', '$2a$10$rQKJXQxYJXxYJXxYJXxYJexJXxYJXxYJXxYJXxYJXxYJXxYJXxYJe');

-- Insert sample packages
INSERT INTO packages (title, destination, description, price, duration, image_url) VALUES
('Paris Romance', 'Paris, France', 'Experience the city of love with this romantic package including Eiffel Tower visit, Seine river cruise, and gourmet dining.', 1299, 5, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400'),
('Tokyo Adventure', 'Tokyo, Japan', 'Explore the vibrant capital of Japan with guided tours of Shibuya, Asakusa, and Mount Fuji day trip.', 1599, 7, 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400'),
('New York Explorer', 'New York, USA', 'Discover the Big Apple with visits to Times Square, Central Park, Statue of Liberty, and Broadway show.', 999, 4, 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400'),
('Bali Paradise', 'Bali, Indonesia', 'Relax in tropical paradise with beach resorts, temple tours, and spa treatments included.', 899, 6, 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400'),
('Dubai Luxury', 'Dubai, UAE', 'Experience luxury with Burj Khalifa visit, desert safari, and yacht dinner cruise.', 1999, 5, 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400'),
('Rome Historical', 'Rome, Italy', 'Step back in time with Colosseum, Vatican City, and authentic Italian cuisine experiences.', 1199, 6, 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400');

-- Create indexes for better performance
CREATE INDEX idx_bookings_package_id ON bookings(package_id);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);
CREATE INDEX idx_packages_destination ON packages(destination);
