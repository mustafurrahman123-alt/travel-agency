# TravelEase - Travel Agency Website

A full-stack travel agency website with glassmorphic design, travel package booking system, and admin panel.

## Features

- 🎨 Glassmorphic UI design
- 📱 Fully responsive
- ✈️ Travel package management
- 📅 Online booking system
- 👥 Admin dashboard
- 📧 Contact form
- 🔒 JWT authentication
- 🗄️ Supabase PostgreSQL database

## Tech Stack

### Frontend
- HTML5
- CSS3 (Glassmorphic design)
- Bootstrap 5
- JavaScript (ES6+)
- Font Awesome Icons

### Backend
- Node.js
- Express.js
- Supabase (PostgreSQL)
- JWT for authentication
- bcrypt for password hashing

## Deployment

### Frontend (Vercel)
1. Push your code to GitHub
2. Import project to Vercel
3. Configure build settings
4. Deploy

### Backend (Render)
1. Push backend to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Add environment variables
5. Deploy

## Environment Variables

Create a `.env` file in backend directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
PORT=5000
