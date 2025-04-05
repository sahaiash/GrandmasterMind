const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path=require('path');
const { createDiffieHellmanGroup } = require('crypto');
const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currPlayer = "W";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(req,res)=>{
    res.render("index",{title:"Chess Game"});
});
io.on("connection",function(uniquesocket){ //callback function
    console.log("connected");
    // uniquesocket.on("disconnect",function(){
    //     console.log("disconnected");
    // }) this is when thew browser is closed then connection is sent from frontend to backend
    if(!players.white){
        players.white=uniquesocket.id;
        uniquesocket.emit("playerRole","W");
    }
    else if(!players.black){
        players.white=uniquesocket.id;
        uniquesocket.emit("playerRole","b");
    }
    else{
        uniquesocket.emit("spectator role");
    }
   uniquesocket.on("disconnect",function(){
         if(uniquesocket.id==players.white){
            delete players.white;
         } else if(uniquesocket.id==players.black){
            delete players.black;
         }
    });
    uniquesocket.on("move",(move)=>{
        try {
            if(chess.turn()=="w" && uniquesocket.id!=players.white) return;
            if(chess.turn()=="b" && uniquesocket.id!=players.black) return;
            const result=chess.move(move);
            if(result){
                currentPlayer=chess.turn();
                io.emit("move",move);
            }
        } catch (error) {
            
        }
    })
});

server.listen(3000,function(){
    console.log("listening on port 3000")
}) 