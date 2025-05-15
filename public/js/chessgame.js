const socket=io();
const chess=new Chess();
const boardElement=document.querySelector(".chessboard");

let draggedPiece=null;
let sourceSquare=null;
let playerRole = 'W'; // Changed to match server's case

// Add socket connection check
socket.on('connect', () => {
    console.log('Connected to server');
    // Request initial board state when connected
    socket.emit('requestBoardState');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Initialize the game
const initGame = () => {
    console.log("Initializing game");
    render();
    // Request current board state
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
      pieceElement.draggable=playerRole.toLowerCase()===square.color; // Case-insensitive comparison
      console.log("Piece draggable:", pieceElement.draggable, "playerRole:", playerRole, "piece color:", square.color);
      
      pieceElement.addEventListener("dragstart",(e)=>{
        if(pieceElement.draggable){
          console.log("Drag started");
          draggedPiece=pieceElement;
          sourceSquare={row:rowindex,col:squareindex};
          e.dataTransfer.setData("text/plain","");
        }
      });
      
      pieceElement.addEventListener("dragend",(e)=>{
        console.log("Drag ended");
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
        console.log("Drop event triggered"); // Debugging line
        if (draggedPiece) {
            const targetSource = {
                row: parseInt(squareElement.dataset.row),
                col: parseInt(squareElement.dataset.col),
            };
            console.log("Target source:", targetSource); // Debugging line
            handleMove(sourceSquare, targetSource);
        }
    });
    
    boardElement.appendChild(squareElement);
    });
  });
};

const handleMove=(source,target)=>{
  const move={
    from:`${String.fromCharCode(97+source.col)}${8-source.row}`,
    to:`${String.fromCharCode(97+target.col)}${8-target.row}`,
    promotion: 'q' // Fixed: Added quotes around 'q'
  }
  console.log("Handling move:", move); // Debugging line
  
  // Validate move before sending
  try {
    const result = chess.move(move);
    if (result) {
      console.log("Valid move, sending to server");
      socket.emit("move", move);
    } else {
      console.log("Invalid move");
      chess.undo(); // Undo the move if it's invalid
    }
  } catch (error) {
    console.error("Error making move:", error);
    chess.undo(); // Undo the move if there's an error
  }
};

const getUnicode=(piece)=>{
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

socket.on("playerRole",function(role){
  console.log("Received player role:", role);
  playerRole=role;
  render();
});

socket.on("spectator role",function(){
  console.log("Received spectator role");
  playerRole=null;
  render();
});

socket.on("move",function(move){
  console.log("Received move from server:", move);
  chess.move(move);
  render();
});

socket.on("boardstate",function(fen){
  console.log("Received board state:", fen);
  chess.load(fen);
  render();
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initGame);
 

