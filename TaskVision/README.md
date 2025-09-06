# TaskVision - Advanced Task Management System

TaskVision is a comprehensive, full-stack task management application designed for modern teams. It provides real-time collaboration, location tracking, time management, and advanced reporting capabilities.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - Role-based access control (Admin/Employee)
- **Real-time Task Management** - Create, assign, track, and complete tasks
- **Location Tracking** - GPS-based employee location monitoring with geofencing
- **Time Tracking** - Clock in/out functionality with detailed time logs
- **Real-time Chat** - Team communication with Socket.IO
- **Advanced Reporting** - Analytics, charts, and PDF export capabilities
- **Progressive Web App (PWA)** - Offline functionality and mobile optimization

### Technical Features
- **Real-time Updates** - Socket.IO for live data synchronization
- **Responsive Design** - Tailwind CSS with mobile-first approach
- **Type Safety** - Full TypeScript implementation
- **Security** - JWT authentication, bcrypt hashing, rate limiting
- **Performance** - Code splitting, lazy loading, and optimization
- **Offline Support** - Service workers and caching strategies

## 🛠 Tech Stack

### Frontend
- **React 18+** with TypeScript
- **Tailwind CSS** for styling
- **React Router Dom** for routing
- **TanStack Query** for state management
- **Socket.IO Client** for real-time communication
- **Leaflet.js** for maps
- **Chart.js** for analytics
- **React Hook Form** for form management
- **React Toastify** for notifications

### Backend
- **Node.js** with Express and TypeScript
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time features
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads
- **Puppeteer** for PDF generation
- **Joi** for validation
- **Helmet** for security

### DevOps & Tools
- **ESLint & Prettier** for code quality
- **Husky** for git hooks
- **Docker** support (optional)
- **PM2** for production deployment

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0.0 or higher)
- **Git**

Optional:
- **Redis** (for session storage and caching)
- **Docker** (for containerized deployment)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/taskvision.git
cd taskvision
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/taskvision

# JWT Secrets (generate secure keys)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Other configurations...
```

#### Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Windows (if MongoDB is installed as a service)
net start MongoDB

# On macOS with Homebrew
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

#### Start the Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

#### Start the Frontend Server
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 📖 Detailed Setup Guide

### Database Setup

#### MongoDB Installation
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Windows
# Download and install from https://www.mongodb.com/try/download/community
```

#### Create Database User (Optional but Recommended)
```javascript
// Connect to MongoDB shell
mongo

// Switch to admin database
use admin

// Create admin user
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: ["userAdminAnyDatabase", "readWriteAnyDatabase"]
})

// Create application database
use taskvision

// Create application user
db.createUser({
  user: "taskvision_user",
  pwd: "your-app-password",
  roles: ["readWrite"]
})
```

### Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Create credentials (API Key)
5. Add the API key to your environment files

### Push Notifications Setup (VAPID Keys)

Generate VAPID keys for push notifications:

```bash
# Install web-push CLI globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Add the generated keys to your environment files.

## 🏗 Project Structure

```
TaskVision/
├── backend/                  # Backend application
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Server entry point
│   ├── tests/              # Test files
│   ├── uploads/            # File uploads directory
│   ├── logs/               # Log files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                # Frontend application
│   ├── public/
│   │   ├── manifest.json   # PWA manifest
│   │   ├── sw.js          # Service worker
│   │   └── index.html
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   ├── App.tsx        # Main app component
│   │   └── index.tsx      # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── .env.example
├── shared/                  # Shared types and utilities
├── docker-compose.yml      # Docker configuration
├── README.md
└── package.json           # Root package.json
```

## 🔧 Development

### Available Scripts

#### Backend Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start           # Start production server
npm run test        # Run tests
npm run test:watch  # Run tests in watch mode
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint errors
npm run format      # Format code with Prettier
```

#### Frontend Scripts
```bash
npm start           # Start development server
npm run build       # Build for production
npm run test        # Run tests
npm run eject       # Eject from Create React App (not recommended)
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint errors
npm run format      # Format code with Prettier
```

### Code Quality

The project uses ESLint and Prettier for code quality and formatting:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format all files
npm run format
```

Pre-commit hooks are set up with Husky to ensure code quality.

## 🔐 Security Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Password Security**: bcrypt hashing with salt rounds
- **Rate Limiting**: Express rate limiter to prevent abuse
- **CORS**: Configurable CORS settings
- **Helmet**: Security headers middleware
- **Input Validation**: Joi validation for all inputs
- **SQL Injection Prevention**: MongoDB naturally prevents SQL injection
- **XSS Protection**: React's built-in XSS protection + sanitization

## 📱 Mobile & PWA Features

- **Responsive Design**: Works on all screen sizes
- **Progressive Web App**: Installable on mobile devices
- **Offline Support**: Service worker for offline functionality
- **Push Notifications**: Real-time notifications on mobile
- **Location Services**: GPS tracking with geofencing
- **Touch Optimized**: Mobile-friendly interactions

## 🚀 Deployment

### Environment Setup

#### Production Environment Variables
```env
# Backend (.env)
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db/taskvision
JWT_SECRET=your-production-jwt-secret
# ... other production configs

# Frontend (.env.production)
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_SOCKET_URL=https://your-api-domain.com
# ... other production configs
```

### Docker Deployment

#### Using Docker Compose
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Individual Docker Builds
```bash
# Backend
cd backend
docker build -t taskvision-backend .
docker run -p 5000:5000 taskvision-backend

# Frontend
cd frontend
docker build -t taskvision-frontend .
docker run -p 3000:3000 taskvision-frontend
```

### Traditional Deployment

#### Backend (Node.js)
```bash
# Build the application
npm run build

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name taskvision-backend

# Set up PM2 to start on system boot
pm2 startup
pm2 save
```

#### Frontend (Static Files)
```bash
# Build for production
npm run build

# Serve with nginx, Apache, or any static file server
# Copy build/ directory to your web server
```

### Cloud Deployment

#### Heroku
```bash
# Backend
heroku create taskvision-backend
heroku addons:create mongolab:sandbox
git subtree push --prefix backend heroku master

# Frontend
heroku create taskvision-frontend
heroku buildpacks:set https://github.com/mars/create-react-app-buildpack.git
git subtree push --prefix frontend heroku master
```

#### AWS/Digital Ocean/Other
- Use the Docker approach or traditional deployment methods
- Set up MongoDB Atlas for database
- Configure environment variables
- Set up SSL certificates
- Configure domain and DNS

## 📊 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "employee"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "employee"
  }
}
```

#### POST /api/auth/login
Authenticate user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### POST /api/auth/refresh
Refresh access token.

#### POST /api/auth/logout
Logout user.

### Task Endpoints

#### GET /api/tasks
Get all tasks (with pagination and filtering).

#### POST /api/tasks
Create a new task.

#### GET /api/tasks/:id
Get specific task.

#### PUT /api/tasks/:id
Update task.

#### DELETE /api/tasks/:id
Delete task.

### User Endpoints

#### GET /api/users
Get all users (admin only).

#### GET /api/users/profile
Get current user profile.

#### PUT /api/users/profile
Update user profile.

### Location Endpoints

#### POST /api/location/update
Update user location.

#### GET /api/location/users
Get all user locations (admin only).

### Real-time Events (Socket.IO)

#### Client Events
- `join_room` - Join a room for real-time updates
- `task_update` - Update task status
- `location_update` - Update user location
- `chat_message` - Send chat message

#### Server Events
- `task_updated` - Task was updated
- `user_location_updated` - User location changed
- `chat_message` - New chat message received
- `notification` - System notification

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run specific test file
npm test -- TaskController.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
- **Unit Tests**: Individual function/component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user workflow testing

## 🔧 Troubleshooting

### Common Issues

#### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Performance Optimization

#### Frontend
- Enable gzip compression
- Optimize images
- Use React.lazy for code splitting
- Implement virtual scrolling for large lists

#### Backend
- Add database indexes
- Implement caching with Redis
- Use connection pooling
- Optimize database queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/your-username/taskvision/issues)
3. Create a new issue with detailed information
4. Contact support at support@taskvision.com

## 🗺 Roadmap

### Phase 1 (Current)
- ✅ Core task management
- ✅ User authentication
- ✅ Real-time updates
- ✅ Location tracking
- ✅ Basic reporting

### Phase 2 (Next Release)
- 🔄 Advanced analytics
- 🔄 Mobile app (React Native)
- 🔄 Integration APIs
- 🔄 Advanced notifications
- 🔄 Team collaboration tools

### Phase 3 (Future)
- 📋 AI-powered insights
- 📋 Voice commands
- 📋 IoT device integration
- 📋 Advanced automation
- 📋 Multi-tenant support

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB team for the excellent database
- Socket.IO team for real-time capabilities
- Tailwind CSS team for the utility-first CSS framework
- All open-source contributors

---

**Built with ❤️ by the TaskVision Team**
