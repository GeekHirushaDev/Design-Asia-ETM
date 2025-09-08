# TaskVision Project - Startup Guide

## 🚀 Quick Start Instructions

### Prerequisites
1. Node.js (v18 or higher)
2. MongoDB (local or Atlas connection)

### Starting the Development Servers

#### Option 1: Using Individual Commands

**Backend Server:**
```powershell
cd backend
npm install
npm run dev
```

**Frontend Server:**
```powershell
cd frontend  
npm install
npm run dev
```

#### Option 2: Using Workspace Scripts
```powershell
# Install all dependencies
npm run install:all

# Start both servers concurrently
npm run dev
```

### 🔧 Troubleshooting

#### Frontend Issues:
If you see PostCSS/Tailwind errors:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Restart the dev server

#### Backend Issues:
If you see module not found errors:
1. Check if MongoDB is running
2. Update `.env` file with correct database URL
3. Install missing dependencies: `npm install`

### 🌐 Access URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

### 📝 Demo Credentials
- Admin: admin@designasia.com / admin123
- Employee: employee@designasia.com / employee123

### 🛠️ Key Features Implemented
- ✅ Authentication & Authorization
- ✅ Role-based access control
- ✅ Responsive dashboard layouts
- ✅ Task management foundation
- ✅ Time tracking interface
- ✅ Real-time Socket.io setup
- ✅ MongoDB integration
- ✅ JWT authentication
- ✅ API error handling
- ✅ TypeScript throughout

### 📁 Project Structure
```
TaskVision/
├── frontend/          # React + Vite + TypeScript
├── backend/           # Node.js + Express + MongoDB
├── shared/            # Shared TypeScript types
└── package.json       # Workspace configuration
```
