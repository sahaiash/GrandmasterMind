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

app.get("/game", optionalAuth, (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    res.render("game", { 
        title: "Chess Game - GrandmasterMind",
        user: req.user
    });
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

io.on("connection", function (uniquesocket) {
    console.log("connected");
    
    // Send initial board state and captured pieces
    uniquesocket.on('requestBoardState', () => {
        uniquesocket.emit('boardstate', chess.fen());
        uniquesocket.emit('capturedPieces', capturedPieces);
    });

    // Handle captured pieces
    uniquesocket.on('pieceCaptured', (piece) => {
        capturedPieces[piece.color === 'w' ? 'white' : 'black'].push(piece);
        io.emit('pieceCaptured', piece);
    });

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "W");
    }
    else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    }
    else {
        uniquesocket.emit("spectator role");
    }

    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id == players.white) {
            delete players.white;
        } else if (uniquesocket.id == players.black) {
            delete players.black;
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;
            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardstate", chess.fen());
            }
            else {
                console.log("Invalid Move :", move);
                uniquesocket.emit("invalid move", move);
            }
        } catch (error) {
            console.log(error);
            uniquesocket.emit("Invalid move", move);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}`);
}); 