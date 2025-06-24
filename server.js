const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store message history in memory
let messageHistory = [];
const MAX_MESSAGES = 100;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeConnections: io.engine.clientsCount
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Send message history to newly connected user
  socket.emit('message history', messageHistory);
  
  // Broadcast when a user connects
  socket.broadcast.emit('user connected', {
    id: socket.id,
    message: 'A user has joined the chat',
    timestamp: new Date().toISOString()
  });
  
  // Handle incoming messages
  socket.on('chat message', (data) => {
    const messageData = {
      id: socket.id,
      username: data.username || 'Anonymous',
      message: data.message,
      timestamp: new Date().toISOString()
    };
    
    // Add to message history
    messageHistory.push(messageData);
    
    // Keep only the last MAX_MESSAGES
    if (messageHistory.length > MAX_MESSAGES) {
      messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }
    
    // Broadcast message to all connected users
    io.emit('chat message', messageData);
    
    console.log(`Message from ${messageData.username}: ${messageData.message}`);
  });
  
  // Handle user typing indicator
  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', {
      username: data.username || 'Anonymous',
      isTyping: data.isTyping
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    socket.broadcast.emit('user disconnected', {
      id: socket.id,
      message: 'A user has left the chat',
      timestamp: new Date().toISOString()
    });
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Socket.IO ready for connections`);
});
