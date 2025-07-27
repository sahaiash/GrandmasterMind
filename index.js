require('dotenv').config();
const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Import configurations
const connectDB = require('./config/database');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');

// Import middleware
const { optionalAuth } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currPlayer = "W";
let capturedPieces = { white: [], black: [] };

// Game state
const games = new Map();
const meetings = new Map(); // Store active meetings

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

// Serve static files with correct MIME types
app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Routes
app.use('/auth', authRoutes);

app.get("/", optionalAuth, (req, res) => {
    res.render("index", { 
        title: "GrandmasterMind - Chess Game",
        user: req.user || null
    });
});

app.get("/login", (req, res) => {
    res.render("login", { 
        title: "Login - GrandmasterMind"
    });
});

app.get("/signup", (req, res) => {
    res.render("signup", { 
        title: "Sign Up - GrandmasterMind"
    });
});

app.get("/register", (req, res) => {
    res.render("register", { 
        title: "Sign Up - GrandmasterMind" 
    });
});

app.get("/register/email", (req, res) => {
    res.render("register_email", { 
        title: "Sign Up with Email - GrandmasterMind"
    });
});

app.post("/register/email", (req, res) => {
    // TODO: Handle email/password registration logic
    res.send('Email registration logic goes here.');
});

app.get("/game", (req, res) => {
    // Check for token in query parameters (from frontend redirect)
    const token = req.query.token || req.cookies.authToken;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        const { verifyToken } = require('./config/jwt');
        const decoded = verifyToken(token);
        
        // Get user from database
        const User = require('./models/User');
        User.findById(decoded.userId).select('-password').then(user => {
            if (!user) {
                return res.redirect('/login');
            }
            
            // Get game mode from query parameters
            const gameMode = req.query.mode || 'local';
            
            res.render("game", { 
                title: "Chess Game - GrandmasterMind",
                user: user,
                gameMode: gameMode
            });
        }).catch(err => {
            console.error('Error finding user:', err);
            res.redirect('/login');
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.redirect('/login');
    }
});

app.get("/logout", (req, res) => {
    res.redirect('/');
});

// Socket.IO with authentication
io.use((socket, next) => {
  // Optional authentication for socket connections
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const { verifyToken } = require('./config/jwt');
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
    } catch (error) {
      // Continue without authentication
    }
  }
  next();
});

io.on("connection", function (socket) {
    console.log("User connected:", socket.id);
    
    // Store socket's meeting info
    socket.meetingId = null;
    socket.playerRole = null;
    
    // Create meeting
    socket.on('createMeeting', (data) => {
        const { meetingId } = data;
        
        if (meetings.has(meetingId)) {
            socket.emit('error', { message: 'Meeting ID already exists' });
            return;
        }
        
        // Create new meeting
        const meeting = {
            id: meetingId,
            host: socket.id,
            guest: null,
            chess: new Chess(),
            players: {
                white: socket.id,
                black: null
            }
        };
        
        meetings.set(meetingId, meeting);
        socket.meetingId = meetingId;
        socket.playerRole = 'w';
        socket.join(meetingId);
        
        socket.emit('meetingCreated', { meetingId });
        console.log(`Meeting created: ${meetingId} by ${socket.id}`);
    });
    
    // Join meeting
    socket.on('joinMeeting', (data) => {
        const { meetingId } = data;
        
        if (!meetings.has(meetingId)) {
            socket.emit('error', { message: 'Meeting not found' });
            return;
        }
        
        const meeting = meetings.get(meetingId);
        
        if (meeting.guest) {
            socket.emit('error', { message: 'Meeting is full' });
            return;
        }
        
        // Join meeting
        meeting.guest = socket.id;
        meeting.players.black = socket.id;
        socket.meetingId = meetingId;
        socket.playerRole = 'b';
        socket.join(meetingId);
        
        // Notify both players
        socket.emit('meetingJoined', { meetingId });
        socket.to(meetingId).emit('opponentJoined', { meetingId });
        
        console.log(`Player joined meeting: ${meetingId}`);
    });
    
    // Handle moves in meetings
    socket.on('move', (data) => {
        const { meetingId, move, result } = data;
        
        if (!meetings.has(meetingId)) {
            socket.emit('error', { message: 'Meeting not found' });
            return;
        }
        
        const meeting = meetings.get(meetingId);
        
        // Verify it's the player's turn
        if (meeting.chess.turn() !== socket.playerRole) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }
        
        try {
            const moveResult = meeting.chess.move(move);
            if (moveResult) {
                // Broadcast move to other player
                socket.to(meetingId).emit('moveReceived', { move, result: moveResult });
                
                // Check for game end
                if (meeting.chess.isGameOver()) {
                    const gameResult = meeting.chess.isCheckmate() ? 
                        (meeting.chess.turn() === 'w' ? 'Black' : 'White') : 'Draw';
                    io.to(meetingId).emit('gameEnd', { result: gameResult });
                }
            } else {
                socket.emit('error', { message: 'Invalid move' });
            }
        } catch (error) {
            console.error('Move error:', error);
            socket.emit('error', { message: 'Invalid move' });
        }
    });
    
    // Leave meeting
    socket.on('leaveMeeting', (data) => {
        const { meetingId } = data;
        
        if (meetings.has(meetingId)) {
            const meeting = meetings.get(meetingId);
            
            // Notify other player
            socket.to(meetingId).emit('opponentLeft', { meetingId });
            
            // Clean up meeting if host leaves
            if (socket.id === meeting.host) {
                meetings.delete(meetingId);
            } else {
                // Guest left, reset guest slot
                meeting.guest = null;
                meeting.players.black = null;
            }
        }
        
        socket.leave(meetingId);
        socket.meetingId = null;
        socket.playerRole = null;
    });
    
    // Handle disconnect
    socket.on("disconnect", function () {
        console.log("User disconnected:", socket.id);
        
        // Handle meeting cleanup on disconnect
        if (socket.meetingId) {
            const meetingId = socket.meetingId;
            if (meetings.has(meetingId)) {
                const meeting = meetings.get(meetingId);
                
                // Notify other player
                socket.to(meetingId).emit('opponentLeft', { meetingId });
                
                // Clean up meeting if host disconnects
                if (socket.id === meeting.host) {
                    meetings.delete(meetingId);
                } else {
                    // Guest disconnected, reset guest slot
                    meeting.guest = null;
                    meeting.players.black = null;
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}`);
}); 