# TaskVision - Task Management System

TaskVision is an internal staff and admin task management system built for Design Asia. It features real-time collaboration, location-based task assignment, time tracking, and comprehensive reporting.

## 🚀 Features

### Core Features
- **Authentication & Authorization**: JWT-based login with role-based access (Admin/Employee)
- **Task Management**: Complete CRUD operations with status flow (Not Started → In Progress → Paused → Completed)
- **Real-time Collaboration**: Socket.io powered chat, notifications, and live updates
- **Time Tracking**: Start, pause, resume timers with estimated vs actual duration tracking
- **Location-based Tasks**: Assign tasks with geofenced locations using OpenStreetMap
- **File Management**: Upload and attach files to tasks
- **Employee Tracking**: Real-time location tracking with battery monitoring

### Advanced Features
- **Attendance System**: Clock-in/out with geolocation verification
- **Automated Task Carryover**: Incomplete tasks automatically roll over to the next day
- **Comprehensive Reporting**: Weekly PDF reports with task performance metrics
- **Push Notifications**: In-app and web push notifications for task updates
- **Mobile-first Design**: Responsive design optimized for mobile, tablet, and desktop

## 🛠 Tech Stack

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development and building
- **Tailwind CSS** + **Preline UI** for styling
- **React Router** for navigation
- **React Query** for server state management
- **Zustand** for client state management
- **Leaflet** for interactive maps
- **Socket.io Client** for real-time features

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **MongoDB** with **Mongoose** ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **BullMQ** with **Redis** for job queues
- **PDFKit** for report generation
- **Multer** for file uploads

### Development Tools
- **ESLint** + **Prettier** for code quality
- **Husky** for git hooks
- **Jest** for testing
- **Swagger** for API documentation

## 📁 Project Structure

```
TaskVision/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json
├── backend/               # Node.js backend application
│   ├── src/
│   │   ├── controllers/   # Route controllers (MVC)
│   │   ├── models/        # Database models
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/    # Custom middleware
│   │   ├── services/      # Business logic services
│   │   ├── utils/         # Utility functions
│   │   ├── jobs/          # Background job definitions
│   │   └── sockets/       # Socket.io event handlers
│   └── package.json
├── shared/                # Shared TypeScript interfaces
│   ├── types/             # Common type definitions
│   └── package.json
└── package.json           # Root package.json for workspace
```

## 🚦 Getting Started

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** >= 5.0
- **Redis** >= 6.0 (for background jobs)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TaskVision
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   
   Copy example environment files and configure:
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   
   # Frontend environment  
   cp frontend/.env.example frontend/.env
   ```

4. **Configure Environment Variables**

   **Backend (.env)**:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/taskvision
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   REDIS_URL=redis://localhost:6379
   UPLOAD_PATH=./uploads
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend (.env)**:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
   ```

5. **Start MongoDB and Redis**
   ```bash
   # MongoDB (if using Docker)
   docker run -d --name mongodb -p 27017:27017 mongo:latest
   
   # Redis (if using Docker)
   docker run -d --name redis -p 6379:6379 redis:latest
   ```

6. **Seed Database** (Optional)
   ```bash
   cd backend
   npm run seed
   ```

7. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run dev:frontend  # Frontend at http://localhost:3000
   npm run dev:backend   # Backend at http://localhost:5000
   ```

## 📱 Default Login Credentials

After seeding the database, you can use these test accounts:

**Admin Account:**
- Email: `admin@designasia.com`
- Password: `admin123`

**Employee Account:**
- Email: `employee@designasia.com`
- Password: `employee123`

## 🏗 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only

# Building
npm run build            # Build all packages
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Code Quality
npm run lint             # Lint all packages
npm run test             # Run all tests
npm run format           # Format code with Prettier

# Database
npm run seed             # Seed database with test data
npm run migrate          # Run database migrations

# Utilities
npm run clean            # Clean all node_modules
npm run install:all      # Install all dependencies
```

### API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:5000/api-docs
- **API Health**: http://localhost:5000/health

### Socket.io Events

The application uses several real-time events:

**Task Events:**
- `task:created` - New task created
- `task:updated` - Task details updated
- `task:status_changed` - Task status changed
- `task:assigned` - Task assigned to user

**Chat Events:**
- `chat:message` - New chat message
- `chat:typing` - User typing indicator

**Tracking Events:**
- `tracking:update` - Location update from employee
- `attendance:clock_in` - Employee clocked in
- `attendance:clock_out` - Employee clocked out

**Notification Events:**
- `notification:new` - New notification for user
- `notification:read` - Notification marked as read

## 🔧 Configuration

### Database Models

The application uses these main models:

- **User**: Employee and admin user accounts
- **Task**: Task management with status, priority, location
- **TimeLog**: Time tracking entries
- **Comment**: Task comments with mentions
- **Attendance**: Daily clock-in/out records
- **TrackingPoint**: Real-time location tracking
- **Notification**: In-app notifications
- **Report**: Generated reports metadata

### File Upload

Files are stored locally in the `backend/uploads` directory by default. For production, configure cloud storage (AWS S3, Google Cloud Storage, etc.).

### Map Integration

The application uses OpenStreetMap with Leaflet for:
- Task location assignment
- Employee real-time tracking
- Attendance geofence verification
- Location-based task filtering

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables for Production

Ensure these environment variables are set in production:

```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
REDIS_URL=redis://your-production-redis
JWT_SECRET=your-production-jwt-secret
FRONTEND_URL=https://your-domain.com
```

### Docker Deployment

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d
```

## 📊 Monitoring

The application includes:
- Health check endpoint: `/health`
- Performance metrics via built-in middleware
- Error tracking and logging
- Database connection monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team at dev@designasia.com

---

**TaskVision** - Built with ❤️ for Design Asia
