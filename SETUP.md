# Video Call Project Setup Guide

## 🏗️ Project Overview

This is a fullstack video calling application with:
- **Frontend**: React + TypeScript + WebRTC
- **Backend**: Golang (Gin) + WebSocket signaling
- **Features**: User authentication, real-time video calls, online user list

## 📋 Prerequisites

Before running this project, make sure you have:

- **Go** (version 1.21 or higher)
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Installing Dependencies

#### Ubuntu/Debian:
```bash
# Install Go
sudo apt update
sudo apt install golang-go

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
go version
node --version
npm --version
```

#### macOS:
```bash
# Install Go
brew install go

# Install Node.js
brew install node

# Verify installations
go version
node --version
npm --version
```

## 🚀 Quick Start

### Option 1: Using the provided script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x run.sh

# Run the project
./run.sh
```

This script will:
1. Check if all dependencies are installed
2. Start the backend server on port 8080
3. Install frontend dependencies and start on port 3000
4. Open both servers automatically

### Option 2: Manual setup

#### Backend Setup:
```bash
cd backend
go mod tidy
go run main.go
```

#### Frontend Setup (in a new terminal):
```bash
cd frontend
npm install
npm start
```

## 🌐 Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

## 📱 How to Use

1. **Register/Login**: Create an account or sign in with existing credentials
2. **View Online Users**: See who's currently online
3. **Start a Call**: Click the "Call" button next to any online user
4. **Accept/Reject Calls**: When someone calls you, you can accept or reject
5. **Video Call**: Enjoy 1-to-1 video calls with WebRTC

## 🏗️ Project Structure

```
project-video-call/
├── backend/                 # Golang backend
│   ├── main.go             # Main server file
│   ├── go.mod              # Go dependencies
│   └── Dockerfile          # Backend Docker configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and WebRTC services
│   │   ├── store/          # Zustand state management
│   │   └── types/          # TypeScript type definitions
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile          # Frontend Docker configuration
├── docker-compose.yml      # Docker orchestration
├── run.sh                  # Quick start script
└── README.md               # Project documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Users
- `GET /api/users` - Get online users (requires authentication)

### WebSocket
- `GET /api/ws` - WebSocket connection for signaling (requires authentication)

## 🐳 Docker Deployment

To deploy using Docker:

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

## 🔒 Security Notes

- JWT secret is hardcoded for development - change in production
- CORS is configured to allow all origins for development
- WebSocket connections are not encrypted in development

## 🐛 Troubleshooting

### Common Issues:

1. **Port already in use**:
   ```bash
   # Kill processes on ports 3000 and 8080
   sudo lsof -ti:3000 | xargs kill -9
   sudo lsof -ti:8080 | xargs kill -9
   ```

2. **WebRTC not working**:
   - Make sure you're using HTTPS in production
   - Check browser permissions for camera/microphone
   - Verify STUN servers are accessible

3. **WebSocket connection failed**:
   - Check if backend is running on port 8080
   - Verify CORS settings
   - Check browser console for errors

### Development Tips:

- Use browser developer tools to debug WebRTC
- Check network tab for API calls
- Monitor WebSocket connections in browser console
- Use multiple browser windows/tabs to test calls

## 📝 Environment Variables

For production deployment, consider setting these environment variables:

```bash
# Backend
JWT_SECRET=your-secure-jwt-secret
GIN_MODE=release

# Frontend
REACT_APP_API_URL=https://your-api-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License. 