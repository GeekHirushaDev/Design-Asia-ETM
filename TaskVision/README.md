# TaskVision - Advanced Task Management System

A comprehensive MERN stack task management application with real-time collaboration, geolocation features, advanced reporting, and PWA capabilities.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - JWT-based auth with role-based permissions
- **Task Management** - Create, assign, track, and manage tasks with priority levels
- **Project Management** - Organize tasks within projects with team collaboration
- **Team Management** - Create teams, assign roles, and manage permissions
- **Real-time Collaboration** - Live updates using Socket.IO
- **Dashboard Analytics** - Visual insights into productivity and progress
- **Advanced Reporting** - Generate comprehensive reports with data export
- **PWA Support** - Offline functionality and mobile app-like experience

### Advanced Features
- **Geolocation & Geofencing** - Location-based task assignments and tracking
- **Time Tracking** - Built-in time tracking with detailed analytics
- **Comments & Attachments** - Rich collaboration tools for tasks
- **Notifications System** - Real-time in-app and email notifications
- **Dark/Light Theme** - User preference-based theming
- **Responsive Design** - Mobile-first responsive interface
- **Search & Filtering** - Advanced search and filtering capabilities
- **Data Visualization** - Charts and graphs for analytics

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **multer** - File upload handling

### Frontend
- **React 18** - UI library with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time client
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Headless UI** - Accessible UI components
- **Chart.js** - Data visualization
- **Leaflet** - Interactive maps
- **Framer Motion** - Animations

## 📁 Project Structure

```
taskvision/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React context providers
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utility functions
│   │   └── services/       # API services
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Express backend
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   ├── package.json
│   └── server.js
├── package.json            # Root package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd taskvision
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Environment Setup**

Create `.env` files in both `server` and `client` directories:

**Server (.env):**
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/taskvision
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

**Client (.env):**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running on your system
mongod
```

5. **Start the application**

From the root directory:
```bash
# Development mode (starts both server and client)
npm run dev

# Or start individually:
# Start server (from server directory)
npm run dev

# Start client (from client directory)
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Available Scripts

### Root Directory
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build the client for production
- `npm run start` - Start the production server

### Server Directory
- `npm run dev` - Start server in development mode with nodemon
- `npm start` - Start server in production mode
- `npm test` - Run server tests
- `npm run seed` - Seed database with sample data

### Client Directory
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Tasks
- `GET /api/tasks` - Get all tasks (with filtering)
- `GET /api/tasks/my` - Get user's tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment to task

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project

### Teams
- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create new team

### Reports & Analytics
- `GET /api/reports/dashboard` - Get dashboard data
- `GET /api/analytics/overview` - Get analytics overview

## 🎨 Design System

The application uses a consistent design system built with Tailwind CSS:

### Colors
- **Primary**: Blue (`#3B82F6`)
- **Success**: Green (`#22C55E`)
- **Warning**: Yellow (`#F59E0B`)
- **Error**: Red (`#EF4444`)

### Typography
- **Font Family**: Inter
- **Headings**: Bold weights
- **Body**: Regular weight

### Components
- **Buttons**: Multiple variants (primary, secondary, outline, ghost)
- **Forms**: Consistent input styling with validation states
- **Cards**: Elevated surfaces with rounded corners
- **Modals**: Overlay components with backdrop blur

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting
- Helmet.js security headers
- MongoDB injection protection

## 📱 PWA Features

- Service worker for offline functionality
- App manifest for installation
- Responsive design for all devices
- Touch-friendly interface
- App-like navigation

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

## 🚀 Deployment

### Production Build
```bash
# Build client
cd client
npm run build

# The build files will be in client/build directory
# Configure your server to serve these static files
```

### Environment Variables
Make sure to set production environment variables:
- Use strong JWT secrets
- Configure production MongoDB URI
- Set NODE_ENV=production
- Configure email settings for notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed description
3. Include steps to reproduce the problem
4. Provide environment details

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB team for the database
- Tailwind CSS for the utility-first CSS framework
- Socket.IO for real-time capabilities
- All other open-source libraries used in this project
