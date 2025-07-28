package main

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for development
		},
	}

	// Database
	db *Database

	// In-memory storage for online status
	users     = make(map[string]User)
	userMutex sync.RWMutex

	// WebSocket connections
	connections = make(map[string]*websocket.Conn)
	connMutex   sync.RWMutex

	// JWT secret
	jwtSecret = []byte("your-secret-key-change-in-production")
)

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Online   bool   `json:"online"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type SignalingMessage struct {
	Type      string `json:"type"`
	From      string `json:"from"`
	To        string `json:"to"`
	Data      string `json:"data"`
	Timestamp int64  `json:"timestamp"`
}

func main() {
	// Initialize database
	var err error
	db, err = NewDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Load existing users from database
	existingUsers, err := db.GetAllUsers()
	if err != nil {
		log.Printf("Warning: Failed to load users from database: %v", err)
	} else {
		users = existingUsers
		log.Printf("Loaded %d users from database", len(users))
	}

	r := gin.Default()

	// CORS configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(config))

	// API routes
	api := r.Group("/api")
	{
		api.POST("/register", register)
		api.POST("/login", login)
		api.GET("/users", authMiddleware(), getOnlineUsers)
		api.GET("/ws", handleWebSocket) // WebSocket handles auth manually
	}

	log.Println("Server starting on :8080")
	r.Run(":8080")
}

func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	userMutex.Lock()
	defer userMutex.Unlock()

	if _, exists := users[req.Username]; exists {
		c.JSON(400, gin.H{"error": "Username already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	newUser := User{
		Username: req.Username,
		Password: string(hashedPassword),
		Online:   false,
	}

	// Save to database
	if err := db.SaveUser(req.Username, newUser); err != nil {
		log.Printf("Failed to save user %s to database: %v", req.Username, err)
		c.JSON(500, gin.H{"error": "Failed to save user"})
		return
	}

	// Save to memory
	users[req.Username] = newUser

	log.Printf("User %s registered successfully", req.Username)
	c.JSON(200, gin.H{"message": "User registered successfully"})
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	userMutex.RLock()
	user, exists := users[req.Username]
	userMutex.RUnlock()

	if !exists {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	// Mark user as online immediately after login
	userMutex.Lock()
	if user, exists := users[req.Username]; exists {
		user.Online = true
		users[req.Username] = user
		log.Printf("User %s marked as online after login", req.Username)
	} else {
		log.Printf("User %s not found in storage during login", req.Username)
	}
	userMutex.Unlock()

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": req.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(200, gin.H{
		"token": tokenString,
		"user":  gin.H{"username": req.Username},
	})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(401, gin.H{"error": "No token provided"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix if present
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(401, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		username, ok := claims["username"].(string)
		if !ok {
			c.JSON(401, gin.H{"error": "Invalid username in token"})
			c.Abort()
			return
		}

		c.Set("username", username)
		c.Next()
	}
}

func getOnlineUsers(c *gin.Context) {
	userMutex.RLock()
	defer userMutex.RUnlock()

	log.Printf("Total users in storage: %d", len(users))

	var onlineUsers []gin.H
	for username, user := range users {
		log.Printf("User: %s, Online: %v", username, user.Online)
		if user.Online {
			onlineUsers = append(onlineUsers, gin.H{
				"username": username,
				"online":   user.Online,
			})
		}
	}

	log.Printf("Online users found: %d", len(onlineUsers))
	c.JSON(200, gin.H{"users": onlineUsers})
}

func handleWebSocket(c *gin.Context) {
	// Get token from query parameter for WebSocket
	tokenString := c.Query("token")
	if tokenString == "" {
		log.Printf("No token provided in WebSocket connection")
		c.AbortWithStatus(401)
		return
	}

	// Parse JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		log.Printf("Invalid token in WebSocket connection: %v", err)
		c.AbortWithStatus(401)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Printf("Invalid token claims in WebSocket connection")
		c.AbortWithStatus(401)
		return
	}

	username, ok := claims["username"].(string)
	if !ok {
		log.Printf("Invalid username in WebSocket token")
		c.AbortWithStatus(401)
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Mark user as online
	userMutex.Lock()
	if user, exists := users[username]; exists {
		user.Online = true
		users[username] = user
	}
	userMutex.Unlock()

	// Store connection
	connMutex.Lock()
	connections[username] = conn
	connMutex.Unlock()

	// Remove connection when user disconnects
	defer func() {
		connMutex.Lock()
		delete(connections, username)
		connMutex.Unlock()

		userMutex.Lock()
		if user, exists := users[username]; exists {
			user.Online = false
			users[username] = user
		}
		userMutex.Unlock()
	}()

	// Handle WebSocket messages
	for {
		var msg SignalingMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		msg.From = username
		msg.Timestamp = time.Now().Unix()

		// Prevent self-call
		if msg.To == username {
			log.Printf("User %s attempted to call themselves - ignoring", username)
			continue
		}

		// Forward message to target user
		connMutex.RLock()
		targetConn, exists := connections[msg.To]
		connMutex.RUnlock()

		if exists {
			err = targetConn.WriteJSON(msg)
			if err != nil {
				log.Printf("Failed to forward message: %v", err)
			}
		} else {
			log.Printf("Target user %s not found or offline", msg.To)
		}
	}
}
