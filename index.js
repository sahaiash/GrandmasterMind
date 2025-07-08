const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');
const { createDiffieHellmanGroup } = require('crypto');
const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currPlayer = "W";
let capturedPieces = { white: [], black: [] };

// Game state
const games = new Map();

app.set("view engine", "ejs");

// Serve static files with correct MIME types
app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Landing page route
app.get("/", (req, res) => {
    res.render("landing", { title: "Grandmaster's Mind" });
});

// Login page route
app.get("/login", (req, res) => {
    res.render("login", { title: "Login" });
});

// Register page route (Google only)
app.get("/register", (req, res) => {
    res.render("register", { title: "Sign Up" });
});

// Manual email signup page
app.get("/register/email", (req, res) => {
    res.render("register_email", { title: "Sign Up with Email" });
});

// Manual email signup POST handler (placeholder)
app.post("/register/email", (req, res) => {
    // TODO: Handle email/password registration logic
    res.send('Email registration logic goes here.');
});

// Game route
app.get("/game", (req, res) => {
    res.render("index", { title: "Chess Game" });
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

server.listen(3000, function () {
    console.log("listening on port 3000");
}); 