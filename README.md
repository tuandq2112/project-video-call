# Video Call Fullstack Project

A real-time video calling application built with React + TypeScript frontend and Golang backend.

## 🏗️ Architecture

- **Frontend**: React + TypeScript with WebRTC for video calls
- **Backend**: Golang (Gin) with WebSocket signaling server
- **Database**: In-memory storage for user sessions
- **Authentication**: JWT-based authentication

## 🚀 Features

- User registration and login with JWT
- Real-time online user list
- 1-to-1 video calls using WebRTC
- WebSocket signaling for SDP/ICE exchange

## 📁 Project Structure

```
project-video-call/
├── frontend/          # React + TypeScript frontend
├── backend/           # Golang backend
├── README.md          # This file
└── docker-compose.yml # Docker setup (optional)
```

## 🛠️ Setup Instructions

### Backend Setup
```bash
cd backend
go mod tidy
go run main.go
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🌐 Usage

1. Start the backend server (port 8080)
2. Start the frontend development server (port 3000)
3. Register/login with a username and password
4. View online users and start video calls

## 🔧 Technologies Used

- **Frontend**: React, TypeScript, WebRTC, Zustand
- **Backend**: Golang, Gin, WebSocket, JWT
- **Real-time**: WebSocket for signaling