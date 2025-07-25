<<<<<<< HEAD
// Get authentication token
const authToken = localStorage.getItem('authToken');

// Connect to socket with authentication
const socket = io({
  auth: {
    token: authToken
  }
});

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = 'W'; // Changed to match server's case
=======
const socket=io();
const chess=new Chess();
const boardElement=document.querySelector(".chessboard");
const capturedWhiteElement = document.getElementById('capturedWhite');
const capturedBlackElement = document.getElementById('capturedBlack');

let draggedPiece=null;
let sourceSquare=null;
let playerRole = 'W';
let capturedPieces = { white: [], black: [] };
>>>>>>> e77c3f5237e791f6e5ea0f92c81e3b814919217d

// Add socket connection check
socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('requestBoardState');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Handle authentication errors
socket.on('auth_error', (error) => {
    console.error('Authentication error:', error);
    // Redirect to login if authentication fails
    if (error.message === 'Invalid token') {
        localStorage.removeItem('authToken');
        location.reload();
    }
});

// Initialize the game
const initGame = () => {
    console.log("Initializing game");
    render();
    socket.emit('requestBoardState');
};

const render = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  console.log("Rendering board:", board);
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add("square",
<<<<<<< HEAD
        (rowindex + squareindex) % 2 == 0 ? "light" : "dark"
      );
      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;
      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black");
        pieceElement.innerText = getUnicode(square);
        pieceElement.draggable = playerRole.toLowerCase() === square.color; // Case-insensitive comparison
        console.log("Piece draggable:", pieceElement.draggable, "playerRole:", playerRole, "piece color:", square.color);
        
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            console.log("Drag started");
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });
        
        pieceElement.addEventListener("dragend", (e) => {
          console.log("Drag ended");
          draggedPiece = null;
          sourceSquare = null;
        });
        
        squareElement.appendChild(pieceElement);
      }
      
      squareElement.addEventListener("dragover", function(e) {
=======
      (rowindex+squareindex)%2==0 ?"light":"dark"
    );
    squareElement.dataset.row=rowindex;
    squareElement.dataset.col=squareindex;
    if(square){
      const pieceElement=document.createElement("div");
      pieceElement.classList.add("piece",square.color==='w'?"white":"black");
      pieceElement.innerText=getUnicode(square);
      pieceElement.draggable=playerRole.toLowerCase()===square.color;
      
      pieceElement.addEventListener("dragstart",(e)=>{
        if(pieceElement.draggable){
          draggedPiece=pieceElement;
          sourceSquare={row:rowindex,col:squareindex};
          e.dataTransfer.setData("text/plain","");
        }
      });
      
      pieceElement.addEventListener("dragend",(e)=>{
        draggedPiece=null;
        sourceSquare=null;
      });
      
      squareElement.appendChild(pieceElement);
    }
    
    squareElement.addEventListener("dragover", function(e) {
>>>>>>> e77c3f5237e791f6e5ea0f92c81e3b814919217d
        e.preventDefault();
      });
      
      squareElement.addEventListener("drop", function(e) {
        e.preventDefault();
        if (draggedPiece) {
<<<<<<< HEAD
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          console.log("Target source:", targetSource); // Debugging line
          handleMove(sourceSquare, targetSource);
=======
            const targetSource = {
                row: parseInt(squareElement.dataset.row),
                col: parseInt(squareElement.dataset.col),
            };
            handleMove(sourceSquare, targetSource);
>>>>>>> e77c3f5237e791f6e5ea0f92c81e3b814919217d
        }
      });
      
      boardElement.appendChild(squareElement);
    });
  });
  updateCapturedPieces();
};

<<<<<<< HEAD
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: 'q' // Fixed: Added quotes around 'q'
=======
const handleMove=(source,target)=>{
  const move={
    from:`${String.fromCharCode(97+source.col)}${8-source.row}`,
    to:`${String.fromCharCode(97+target.col)}${8-target.row}`,
    promotion: 'q'
>>>>>>> e77c3f5237e791f6e5ea0f92c81e3b814919217d
  }
  
  try {
    const result = chess.move(move);
    if (result) {
      if (result.captured) {
        const capturedPiece = {
          type: result.captured,
          color: result.color === 'w' ? 'b' : 'w'
        };
        capturedPieces[result.color === 'w' ? 'white' : 'black'].push(capturedPiece);
        // Emit captured piece to server
        socket.emit('pieceCaptured', capturedPiece);
      }
      socket.emit("move", move);
    } else {
      chess.undo();
    }
  } catch (error) {
    console.error("Error making move:", error);
    chess.undo();
  }
};

<<<<<<< HEAD
const getUnicode = (piece) => {
  const unicode = {
    k: "♔", // King
    q: "♕", // Queen
    r: "♖", // Rook
    b: "♗", // Bishop
    n: "♘", // Knight
    p: "♙", // Pawn
    K: "♚", // king
    Q: "♛", // queen
    R: "♜", // rook
    B: "♝", // bishop
    N: "♞", // knight
    P: "♟", // pawn
  };
  const result = unicode[piece.type] || "";
  console.log("Piece type:", piece.type, "Unicode:", result); // Debugging line
  return result;
};

socket.on("playerRole", function(role) {
  console.log("Received player role:", role);
  playerRole = role;
  render();
});

socket.on("spectator role", function() {
  console.log("Received spectator role");
  playerRole = null;
  render();
});

socket.on("move", function(move) {
  console.log("Received move from server:", move);
  chess.move(move);
  render();
});

socket.on("boardstate", function(fen) {
  console.log("Received board state:", fen);
  chess.load(fen);
  render();
});
=======
// Handle captured pieces from server
socket.on('pieceCaptured', (piece) => {
    capturedPieces[piece.color === 'w' ? 'white' : 'black'].push(piece);
    updateCapturedPieces();
});

socket.on("move",function(move){
  const result = chess.move(move);
  if (result && result.captured) {
    const capturedPiece = {
      type: result.captured,
      color: result.color === 'w' ? 'b' : 'w'
    };
    capturedPieces[result.color === 'w' ? 'white' : 'black'].push(capturedPiece);
  }
  render();
});

socket.on("boardstate",function(fen){
  chess.load(fen);
  capturedPieces = { white: [], black: [] };
  render();
});

socket.on("playerRole",function(role){
  playerRole=role;
  render();
});

socket.on("spectator role",function(){
  playerRole=null;
  render();
});

// Update captured pieces display
function updateCapturedPieces() {
    capturedWhiteElement.innerHTML = '';
    capturedBlackElement.innerHTML = '';

    const pieceValues = { 'q': 5, 'r': 4, 'b': 3, 'n': 2, 'p': 1 };
    
    capturedPieces.white.sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);
    capturedPieces.black.sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);

    capturedPieces.white.forEach(piece => {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'captured-piece white';
        pieceElement.textContent = getUnicode(piece);
        capturedWhiteElement.appendChild(pieceElement);
    });

    capturedPieces.black.forEach(piece => {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'captured-piece black';
        pieceElement.textContent = getUnicode(piece);
        capturedBlackElement.appendChild(pieceElement);
    });
}

const getUnicode=(piece)=>{
  const unicode = {
    k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙",
    K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟"
  };
  return unicode[piece.type] || "";
};
>>>>>>> e77c3f5237e791f6e5ea0f92c81e3b814919217d

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initGame);
 

