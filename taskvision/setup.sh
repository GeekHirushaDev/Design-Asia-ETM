#!/bin/bash

# TaskVision Setup Script
echo "🚀 Setting up TaskVision..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please install Node.js v16 or higher."
    exit 1
fi

print_success "Node.js v$NODE_VERSION detected"

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    print_warning "MongoDB is not installed or not in PATH."
    print_warning "Please make sure MongoDB is installed and running."
    print_warning "Visit: https://docs.mongodb.com/manual/installation/"
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Root dependencies installed"
else
    print_error "Failed to install root dependencies"
    exit 1
fi

# Install server dependencies
print_status "Installing server dependencies..."
cd server
npm install
if [ $? -eq 0 ]; then
    print_success "Server dependencies installed"
else
    print_error "Failed to install server dependencies"
    exit 1
fi

# Install client dependencies
print_status "Installing client dependencies..."
cd ../client
npm install
if [ $? -eq 0 ]; then
    print_success "Client dependencies installed"
else
    print_error "Failed to install client dependencies"
    exit 1
fi

cd ..

# Create environment files if they don't exist
print_status "Setting up environment files..."

# Server .env
if [ ! -f "server/.env" ]; then
    print_status "Creating server .env file..."
    cat > server/.env << EOL
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/taskvision
JWT_SECRET=your_super_secret_jwt_key_here_please_change_in_production
JWT_EXPIRES_IN=7d
EOL
    print_success "Server .env file created"
    print_warning "Please update the JWT_SECRET in server/.env with a secure secret key"
else
    print_success "Server .env file already exists"
fi

# Client .env
if [ ! -f "client/.env" ]; then
    print_status "Creating client .env file..."
    cat > client/.env << EOL
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
EOL
    print_success "Client .env file created"
else
    print_success "Client .env file already exists"
fi

print_success "TaskVision setup completed! 🎉"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running on your system"
echo "2. Update the JWT_SECRET in server/.env if you haven't already"
echo "3. Run 'npm run dev' to start both server and client"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo ""
echo "Happy coding! 🚀"
