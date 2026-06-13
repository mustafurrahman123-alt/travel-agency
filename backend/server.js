require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow all origins for Render deployment
app.use(cors({
    origin: ['http://localhost:3000', 'https://travel-agency-ten-jade.vercel.app', '*'],
    credentials: true
}));
app.use(express.json());

// Supabase initialization
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// ========== AUTHENTICATION MIDDLEWARE ==========
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

// ========== PUBLIC ROUTES ==========

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

// Get all packages (public)
app.get('/api/packages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) throw error;
        res.json(data || []);
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

// Create booking (public)
app.post('/api/bookings', async (req, res) => {
    try {
        const {
            package_id,
            package_title,
            customer_name,
            customer_email,
            travel_date,
            guests,
            total_price
        } = req.body;
        
        // Get package title if not provided
        let title = package_title;
        if (package_id && !title) {
            const { data: pkg } = await supabase
                .from('packages')
                .select('title')
                .eq('id', package_id)
                .single();
            title = pkg?.title;
        }
        
        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                package_id,
                package_title: title,
                customer_name,
                customer_email,
                travel_date,
                guests: guests || 1,
                total_price: total_price || 0,
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

// ========== ADMIN AUTH ROUTES ==========

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

// ========== ADMIN PROTECTED ROUTES ==========

// Get all packages (admin)
app.get('/api/admin/packages', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create package (admin)
app.post('/api/admin/packages', authenticateAdmin, async (req, res) => {
    try {
        const {
            title,
            destination,
            location,
            description,
            price,
            duration,
            days,
            image_url,
            imageUrl
        } = req.body;
        
        const packageData = {
            title,
            destination: destination || location,
            description,
            price,
            duration: duration || days,
            image_url: image_url || imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400'
        };
        
        const { data, error } = await supabase
            .from('packages')
            .insert([packageData])
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
        const {
            title,
            destination,
            location,
            description,
            price,
            duration,
            days,
            image_url,
            imageUrl
        } = req.body;
        
        const updateData = {
            title,
            destination: destination || location,
            description,
            price,
            duration: duration || days,
            image_url: image_url || imageUrl,
            updated_at: new Date()
        };
        
        // Remove undefined fields
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );
        
        const { data, error } = await supabase
            .from('packages')
            .update(updateData)
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
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update booking (admin)
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

// Get all messages (admin)
app.get('/api/admin/messages', authenticateAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard stats (admin)
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const { count: totalPackages } = await supabase
            .from('packages')
            .select('*', { count: 'exact', head: true });
        
        const { count: totalBookings } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });
        
        const { count: totalMessages } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
        
        const { data: revenue } = await supabase
            .from('bookings')
            .select('total_price')
            .eq('status', 'confirmed');
        
        const totalRevenue = revenue?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        
        const { data: recentBookings } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        res.json({
            totalPackages: totalPackages || 0,
            totalBookings: totalBookings || 0,
            totalMessages: totalMessages || 0,
            totalRevenue,
            recentBookings: recentBookings || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== START SERVER - CRITICAL FIX ==========
// MUST bind to '0.0.0.0' for Render to detect the port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Bound to 0.0.0.0:${PORT}`);
    console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
    console.log(`✅ Ready to accept connections`);
});
