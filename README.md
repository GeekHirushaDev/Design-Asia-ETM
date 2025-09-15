# TaskFlow - Real-time Task Management Platform

A comprehensive task management platform with real-time collaboration, location tracking, and advanced reporting capabilities.

## Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Device/session tracking and management
- Email verification and password reset
- Session revocation and security monitoring

### 📋 Task Management
- Create, assign, and track tasks
- Real-time status updates
- Time tracking with pause/resume functionality
- Location-based tasks with geofencing
- Priority levels and due dates
- Task comments and mentions
- File attachments and uploads

### 📍 Location & Tracking
- Real-time employee location tracking
- Geofence management and alerts
- Location-based attendance
- GPS breadcrumb trails
- Battery level monitoring

### 📊 Reporting & Analytics
- Automated PDF report generation
- Weekly and custom reports
- Task performance analytics
- Attendance reports
- Background job processing

### 🔔 Notifications
- Real-time push notifications
- In-app notification center
- Email notifications
- PWA support with offline capabilities

### 💬 Communication
- Task-based chat system
- Real-time messaging
- User mentions and notifications
- File sharing in conversations

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Leaflet** for maps
- **Socket.io Client** for real-time features
- **PWA** with service worker support

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **MongoDB** with Mongoose
- **Redis** for caching and job queues
- **Socket.io** for real-time communication
- **BullMQ** for background jobs
- **Puppeteer** for PDF generation

### Infrastructure
- **AWS S3** for file storage
- **Nodemailer** for email services
- **Web Push** for notifications
- **Zod** for validation
- **Winston** for logging

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- Redis server
- AWS S3 bucket (for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd taskflow
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp server/.env.example server/.env
   
   # Edit server/.env with your configuration
   ```

4. **Generate VAPID Keys** (for push notifications)
   ```bash
   cd server
   npx tsx src/scripts/generateVapidKeys.ts
   # Add the generated keys to your .env file
   ```

5. **Seed the Database**
   ```bash
   # Seed initial data and roles
   npm run server:seed
   npx tsx server/src/scripts/seedRoles.ts
   ```

6. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run full:dev
   
   # Or start individually
   npm run dev              # Frontend only
   npm run server:dev       # Backend only
   ```

### Environment Variables

Create a `server/.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=your-mongodb-connection-string

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Redis
REDIS_URL=redis://localhost:6379

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@gmail.com
# Super Admin
SUPER_ADMIN_USERNAME=superadmin
# Password Policy
# Enable strict rules (min 8, upper, lower, digit, symbol)
PASSWORD_STRICT_POLICY=false

# Frontend (Vite) env
# In .env (root) or via build env var
VITE_PASSWORD_STRICT_POLICY=false
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email address

### Task Management
- `GET /api/tasks` - Get tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/time/start` - Start time tracking
- `POST /api/tasks/:id/time/stop` - Stop time tracking
- `POST /api/tasks/:id/time/pause` - Pause time tracking
- `POST /api/tasks/:id/time/resume` - Resume time tracking

### Comments & Communication
- `GET /api/comments/task/:taskId` - Get task comments
- `POST /api/comments/task/:taskId` - Create comment
- `PUT /api/comments/:commentId` - Update comment
- `DELETE /api/comments/:commentId` - Delete comment

### Location & Tracking
- `POST /api/tracking/ping` - Submit location update
- `GET /api/tracking/current` - Get current locations
- `GET /api/tracking/history` - Get tracking history
- `GET /api/tracking/trail/:userId` - Get user trail

### Geofencing
- `GET /api/geofences` - Get geofences
- `POST /api/geofences` - Create geofence
- `PUT /api/geofences/:id` - Update geofence
- `DELETE /api/geofences/:id` - Delete geofence

### Reports
- `POST /api/reports/weekly/generate` - Generate weekly report
- `POST /api/reports/custom/generate` - Generate custom report
- `GET /api/reports/job/:jobId/status` - Get job status
- `GET /api/reports/:reportId/download` - Download report

### File Uploads
- `POST /api/uploads/presign` - Get presigned upload URL
- `POST /api/uploads/direct` - Direct file upload
- `GET /api/uploads/download/:key` - Get download URL
- `DELETE /api/uploads/:key` - Delete file

## Deployment

### Production Build
```bash
# Build frontend
npm run build

# Build backend
npm run server:build

# Start production server
npm run server:start
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@taskflow.com or join our Slack channel.