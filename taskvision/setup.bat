@echo off
setlocal EnableDelayedExpansion

echo.
echo ===============================================
echo    TaskVision Setup Script for Windows
echo ===============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js v16 or higher.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [SUCCESS] Node.js detected
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Version: %NODE_VERSION%

:: Install root dependencies
echo.
echo [INFO] Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Root dependencies installed

:: Install server dependencies
echo.
echo [INFO] Installing server dependencies...
cd server
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Server dependencies installed

:: Install client dependencies
echo.
echo [INFO] Installing client dependencies...
cd ..\client
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install client dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Client dependencies installed

cd ..

:: Create environment files if they don't exist
echo.
echo [INFO] Setting up environment files...

:: Server .env
if not exist "server\.env" (
    echo [INFO] Creating server .env file...
    (
        echo NODE_ENV=development
        echo PORT=5000
        echo CLIENT_URL=http://localhost:3000
        echo MONGODB_URI=mongodb://localhost:27017/taskvision
        echo JWT_SECRET=your_super_secret_jwt_key_here_please_change_in_production
        echo JWT_EXPIRES_IN=7d
    ) > server\.env
    echo [SUCCESS] Server .env file created
    echo [WARNING] Please update the JWT_SECRET in server\.env with a secure secret key
) else (
    echo [SUCCESS] Server .env file already exists
)

:: Client .env
if not exist "client\.env" (
    echo [INFO] Creating client .env file...
    (
        echo REACT_APP_API_URL=http://localhost:5000/api
        echo REACT_APP_SERVER_URL=http://localhost:5000
    ) > client\.env
    echo [SUCCESS] Client .env file created
) else (
    echo [SUCCESS] Client .env file already exists
)

echo.
echo ===============================================
echo    TaskVision setup completed successfully! 
echo ===============================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running on your system
echo    - Download from: https://www.mongodb.com/try/download/community
echo    - Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas
echo.
echo 2. Update the JWT_SECRET in server\.env if you haven't already
echo.
echo 3. Run 'npm run dev' to start both server and client
echo.
echo The application will be available at:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo Happy coding! 
echo.
pause
