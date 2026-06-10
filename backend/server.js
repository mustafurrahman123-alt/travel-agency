require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS for production
app.use(cors({
    origin: ['http://localhost:3000', 'https://travel-agency-ten-jade.vercel.app'], // Add your Vercel URL later
    credentials: true
}));
app.use(express.json());

// Supabase initialization
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        res.json({ message: 'Connected to Supabase!', success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
app.post('/api/bookings', async (req, res) => {
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
app.post('/api/contact', async (req, res) => {
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

// JWT Setup
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = process.env.JWT_SECRET;

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

// Middleware to authenticate admin
const authenticateAdmin = (req, res, next) => {
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

// Admin routes
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

app.post('/api/admin/packages', authenticateAdmin, async (req, res) => {
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
    console.log(`Test API: http://localhost:${PORT}/api/test`);
});
