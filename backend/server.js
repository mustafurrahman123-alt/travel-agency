require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase initialization
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

// ============= PUBLIC ROUTES =============

// Get all packages
app.get('/api/packages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single package
app.get('/api/packages/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create booking
app.post('/api/bookings', [
    body('customer_name').notEmpty().trim(),
    body('customer_email').isEmail(),
    body('travel_date').isDate(),
    body('package_id').isInt()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { package_id, customer_name, customer_email, travel_date } = req.body;
        
        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                package_id,
                customer_name,
                customer_email,
                travel_date,
                status: 'pending'
            }])
            .select();
        
        if (error) throw error;
        res.json({ message: 'Booking created successfully', booking: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Contact form
app.post('/api/contact', [
    body('name').notEmpty().trim(),
    body('email').isEmail(),
    body('message').notEmpty().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { name, email, message } = req.body;
        
        const { data, error } = await supabase
            .from('contacts')
            .insert([{ name, email, message }])
            .select();
        
        if (error) throw error;
        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ADMIN ROUTES =============

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all packages (admin)
app.get('/api/admin/packages', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create package (admin)
app.post('/api/admin/packages', authenticateAdmin, [
    body('title').notEmpty().trim(),
    body('destination').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('price').isFloat({ min: 0 }),
    body('duration').isInt({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { title, destination, description, price, duration, image_url } = req.body;
        
        const { data, error } = await supabase
            .from('packages')
            .insert([{
                title,
                destination,
                description,
                price,
                duration,
                image_url: image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400'
            }])
            .select();
        
        if (error) throw error;
        res.json({ message: 'Package created successfully', package: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update package (admin)
app.put('/api/admin/packages/:id', authenticateAdmin, async (req, res) => {
    try {
        const { title, destination, description, price, duration, image_url } = req.body;
        
        const { data, error } = await supabase
            .from('packages')
            .update({
                title,
                destination,
                description,
                price,
                duration,
                image_url,
                updated_at: new Date()
            })
            .eq('id', req.params.id)
            .select();
        
        if (error) throw error;
        res.json({ message: 'Package updated successfully', package: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete package (admin)
app.delete('/api/admin/packages/:id', authenticateAdmin, async (req, res) => {
    try {
        const { error } = await supabase
            .from('packages')
            .delete()
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all bookings (admin)
app.get('/api/admin/bookings', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                packages (
                    title
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update booking status (admin)
app.put('/api/admin/bookings/:id', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        
        const { data, error } = await supabase
            .from('bookings')
            .update({ status, updated_at: new Date() })
            .eq('id', req.params.id)
            .select();
        
        if (error) throw error;
        res.json({ message: 'Booking updated successfully', booking: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete booking (admin)
app.delete('/api/admin/bookings/:id', authenticateAdmin, async (req, res) => {
    try {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all contact messages (admin)
app.get('/api/admin/messages', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
