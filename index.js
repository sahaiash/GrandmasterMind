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

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("connected");
    
    // Handle board state requests
    uniquesocket.on('requestBoardState', () => {
        console.log('Sending board state');
        uniquesocket.emit('boardstate', chess.fen());
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