const socket=io();
const chess=new Chess();
const boardElement=document.querySelector(".chessboard");
const capturedWhiteElement = document.getElementById('capturedWhite');
const capturedBlackElement = document.getElementById('capturedBlack');

let draggedPiece=null;
let sourceSquare=null;
let playerRole = 'W';
let capturedPieces = { white: [], black: [] };

// Add socket connection check
socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('requestBoardState');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Initialize the game
const initGame = () => {
    console.log("Initializing game");
    render();
    socket.emit('requestBoardState');
};

const render=()=>{
  const board=chess.board();
  boardElement.innerHTML="";
  console.log("Rendering board:", board);
  board.forEach((row,rowindex)=>{
    row.forEach((square,squareindex)=>{
      const squareElement=document.createElement("div");
      squareElement.classList.add("square",
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
        e.preventDefault();
    });
    
    squareElement.addEventListener("drop", function(e) {
        e.preventDefault();
        if (draggedPiece) {
            const targetSource = {
                row: parseInt(squareElement.dataset.row),
                col: parseInt(squareElement.dataset.col),
            };
            handleMove(sourceSquare, targetSource);
        }
    });
    
    boardElement.appendChild(squareElement);
    });
  });
  updateCapturedPieces();
};

const handleMove=(source,target)=>{
  const move={
    from:`${String.fromCharCode(97+source.col)}${8-source.row}`,
    to:`${String.fromCharCode(97+target.col)}${8-target.row}`,
    promotion: 'q'
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

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initGame);
 

