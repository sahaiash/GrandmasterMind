const socket=io();
const chess=new Chess();
const boardElement=document.querySelector(".chessboard");

let draggedPiece=null;
let sourceSquare=null;
let playerRole=null;

const render=()=>{
   const board=chess.board();
    boardElement.innerHTML="";
    console.log(board);
    board.forEach((row,rowindex)=>{
      console.log(row,rowindex); 
    });
};
const handleMove=()=>{};
const getUnicode=()=>{};

render();