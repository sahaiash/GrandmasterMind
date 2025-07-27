// Enhanced Chess Game JavaScript
class ChessGame {
    constructor() {
        console.log('ChessGame constructor called');
        
        this.boardElement = document.querySelector(".chessboard");
        console.log('Board element found:', this.boardElement);
        
        if (!this.boardElement) {
            console.error('Chess board element not found!');
            return;
        }
        
        this.draggedPiece = null;
        this.sourceSquare = null;
        this.playerRole = null;
        this.isGameActive = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        
        // Multiplayer properties
        this.meetingId = null;
        this.isHost = false;
        this.opponentConnected = false;
        
        // Get game mode from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.gameMode = urlParams.get('mode') || 'local'; // 'local', 'online', or 'bot'
        
        console.log('Game mode:', this.gameMode);
        
        // Try to create chess object
        try {
            this.chess = new Chess();
            console.log('Chess object created successfully');
        } catch (error) {
            console.error('Error creating chess object:', error);
            this.createBasicChessBoard();
            return;
        }
        
        // Initialize socket with authentication
        this.initSocket();
        this.initGame();
    }

    initSocket() {
        try {
            // Connect to socket server
            this.socket = io();
            
            // Socket event listeners
            this.socket.on('connect', () => {
                console.log('Connected to server');
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.showToast('Connection lost!', 'error');
            });
            
            // Meeting events
            this.socket.on('meetingCreated', (data) => {
                console.log('Meeting created:', data);
                this.showToast('Meeting created successfully!', 'success');
            });
            
            this.socket.on('meetingJoined', (data) => {
                console.log('Meeting joined:', data);
                this.opponentConnected = true;
                this.updatePlayerStatus();
                this.showToast('Opponent joined! Game starting...', 'success');
            });
            
            this.socket.on('opponentJoined', (data) => {
                console.log('Opponent joined:', data);
                this.opponentConnected = true;
                this.updatePlayerStatus();
                this.showToast('Opponent joined! Game starting...', 'success');
            });
            
            this.socket.on('opponentLeft', (data) => {
                console.log('Opponent left:', data);
                this.opponentConnected = false;
                this.updatePlayerStatus();
                this.showToast('Opponent left the game', 'warning');
            });
            
            // Game events
            this.socket.on('moveReceived', (data) => {
                console.log('Move received:', data);
                this.handleOpponentMove(data.move, data.result);
            });
            
            this.socket.on('gameEnd', (data) => {
                console.log('Game ended:', data);
                this.handleRemoteGameEnd(data.result);
            });
            
            // Set up game mode specific initialization
            if (this.gameMode === 'online') {
                // Online multiplayer mode
                this.playerRole = null; // Will be set when joining/creating meeting
                this.isGameActive = false;
                this.updateMultiplayerUI();
            } else if (this.gameMode === 'bot') {
                // Bot mode
                this.playerRole = 'W'; // Player is always white against bot
                this.isGameActive = true;
                this.showToast('AI Challenge mode activated!', 'info');
            } else {
                // Local game mode (default)
                this.playerRole = 'W'; // Assume white for local play
                this.isGameActive = true;
            }
            
            // Initialize the game immediately
            this.render();
            this.updateGameUI();
            this.showToast('Connected to server. Ready for multiplayer!', 'success');
            
        } catch (error) {
            console.error('Socket connection failed:', error);
            this.socket = null;
            
            // Fallback to local mode
            this.playerRole = 'W';
            this.isGameActive = true;
            this.render();
            this.updateGameUI();
            this.showToast('Local game mode activated', 'success');
        }
    }

    initGame() {
        this.render();
        this.updateGameUI();
    }

    render() {
        console.log('Render function called');
        
        if (!this.chess) {
            console.error('Chess object not available');
            this.boardElement.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error: Chess object not available</div>';
            return;
        }
        
        if (!this.boardElement) {
            console.error('Board element not available');
            return;
        }
        
        try {
            const board = this.chess.board();
            this.boardElement.innerHTML = "";

            console.log('Rendering board:', board);
            console.log('Current FEN:', this.chess.fen());
            console.log('Current turn:', this.chess.turn());

            // Create a simple 8x8 grid
            for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
                for (let colIndex = 0; colIndex < 8; colIndex++) {
                    const squareElement = this.createSquare(rowIndex, colIndex, board[rowIndex][colIndex]);
                    this.boardElement.appendChild(squareElement);
                }
            }
            
            console.log('Board rendered successfully');
        } catch (error) {
            console.error('Error rendering board:', error);
            this.boardElement.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error rendering board: ' + error.message + '</div>';
        }
    }

    createSquare(rowIndex, colIndex, piece) {
        const squareElement = document.createElement("div");
        squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");
        squareElement.dataset.row = rowIndex;
        squareElement.dataset.col = colIndex;

        if (piece) {
            const pieceElement = this.createPiece(piece, rowIndex, colIndex);
            squareElement.appendChild(pieceElement);
        }

        // Add drag and drop event listeners
        this.addDragDropListeners(squareElement, rowIndex, colIndex);

        return squareElement;
    }

    createPiece(piece, rowIndex, colIndex) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", piece.color === 'w' ? "white" : "black");
        pieceElement.innerText = this.getUnicode(piece);
        
        // For now, allow all pieces to be draggable for testing
        pieceElement.draggable = true;

        pieceElement.addEventListener("dragstart", (e) => {
            if (pieceElement.draggable) {
                this.draggedPiece = pieceElement;
                this.sourceSquare = { row: rowIndex, col: colIndex };
                pieceElement.classList.add('dragging');
                e.dataTransfer.setData("text/plain", "");
            }
        });

        pieceElement.addEventListener("dragend", (e) => {
            pieceElement.classList.remove('dragging');
            this.draggedPiece = null;
            this.sourceSquare = null;
        });

        return pieceElement;
    }

    addDragDropListeners(squareElement, rowIndex, colIndex) {
        squareElement.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (this.draggedPiece) {
                squareElement.classList.add('highlight');
            }
        });

        squareElement.addEventListener("dragleave", (e) => {
            squareElement.classList.remove('highlight');
        });

        squareElement.addEventListener("drop", (e) => {
            e.preventDefault();
            squareElement.classList.remove('highlight');
            
            if (this.draggedPiece && this.sourceSquare) {
                const targetSquare = {
                    row: parseInt(squareElement.dataset.row),
                    col: parseInt(squareElement.dataset.col)
                };
                this.handleMove(this.sourceSquare, targetSquare);
            }
        });
    }

    handleMove(source, target) {
        // Check if game is still active
        if (!this.isGameActive) {
            this.showToast('Game has ended! Start a new game to continue.', 'warning');
            return;
        }
        
        // Check if it's player's turn in multiplayer mode
        if (this.gameMode === 'online' && this.chess.turn() !== this.playerRole) {
            this.showToast("It's not your turn!", 'warning');
            return;
        }
        
        // Check if it's player's turn in bot mode
        if (this.gameMode === 'bot' && this.chess.turn() !== this.playerRole) {
            this.showToast("It's not your turn!", 'warning');
            return;
        }
        
        // Convert coordinates to algebraic notation
        const fromSquare = `${String.fromCharCode(97 + source.col)}${8 - source.row}`;
        const toSquare = `${String.fromCharCode(97 + target.col)}${8 - target.row}`;
        
        console.log(`Source coordinates: row=${source.row}, col=${source.col}`);
        console.log(`Target coordinates: row=${target.row}, col=${target.col}`);
        console.log(`Attempting move from ${fromSquare} to ${toSquare}`);
        console.log('Current board state:', this.chess.fen());
        console.log('Current turn:', this.chess.turn());
        
        // Create move object in the format chess.js expects
        const move = {
            from: fromSquare,
            to: toSquare
        };

        try {
            const result = this.chess.move(move);
            if (result) {
                console.log('Move successful:', result);
                this.handleMoveResult(result);
                
                // Emit move to opponent in multiplayer mode
                if (this.gameMode === 'online' && this.socket) {
                    this.socket.emit("move", {
                        meetingId: this.meetingId,
                        move: move,
                        result: result
                    });
                }
                
                // Make bot move in bot mode
                if (this.gameMode === 'bot' && this.isGameActive) {
                    setTimeout(() => {
                        this.makeBotMove();
                    }, 500); // Small delay for better UX
                }
                
                this.moveHistory.push(move);
                this.render(); // Re-render the board after move
                this.updateGameUI();
            } else {
                console.log('Move failed - invalid move');
                this.showToast('Invalid move!', 'error');
            }
        } catch (error) {
            console.error("Error making move:", error);
            this.showToast('Invalid move!', 'error');
        }
    }

    handleMoveResult(result) {
        if (result.captured) {
            const capturedPiece = {
                type: result.captured,
                color: result.color === 'w' ? 'b' : 'w'
            };
            this.capturedPieces[result.color === 'w' ? 'white' : 'black'].push(capturedPiece);
            if (this.socket) {
                this.socket.emit('pieceCaptured', capturedPiece);
            }
        }

        // Check for game end conditions
        try {
            if (this.chess.in_checkmate()) {
                const winner = this.chess.turn() === 'w' ? 'Black' : 'White';
                this.showToast(`Checkmate! ${winner} wins!`, 'success');
                this.isGameActive = false;
                this.endGame(winner);
            } else if (this.chess.in_stalemate()) {
                this.showToast('Stalemate! Game ended in a draw.', 'info');
                this.isGameActive = false;
                this.endGame('Stalemate');
            } else if (this.chess.in_draw()) {
                this.showToast('Draw! Game ended in a draw.', 'info');
                this.isGameActive = false;
                this.endGame('Draw');
            } else if (this.chess.in_check()) {
                this.showToast('Check!', 'warning');
            }
        } catch (error) {
            console.error('Error checking game state:', error);
        }
    }

    makeBotMove() {
        if (!this.isGameActive || this.chess.turn() === this.playerRole) {
            return;
        }

        try {
            // Get all possible moves
            const moves = this.chess.moves();
            
            if (moves.length === 0) {
                return; // No moves available
            }

            // Get difficulty level
            const difficultySelect = document.getElementById('difficultySelect');
            const difficulty = difficultySelect ? difficultySelect.value : 'medium';
            
            let selectedMove;
            
            // Simple AI based on difficulty
            switch (difficulty) {
                case 'easy':
                    // Random move
                    selectedMove = moves[Math.floor(Math.random() * moves.length)];
                    break;
                case 'medium':
                    // Prefer captures and checks
                    const captures = moves.filter(move => move.includes('x'));
                    const checks = moves.filter(move => move.includes('+'));
                    if (captures.length > 0) {
                        selectedMove = captures[Math.floor(Math.random() * captures.length)];
                    } else if (checks.length > 0) {
                        selectedMove = checks[Math.floor(Math.random() * checks.length)];
                    } else {
                        selectedMove = moves[Math.floor(Math.random() * moves.length)];
                    }
                    break;
                case 'hard':
                    // Prefer captures, checks, and center control
                    const centerMoves = moves.filter(move => {
                        const to = move.slice(-2);
                        return ['d4', 'd5', 'e4', 'e5'].includes(to);
                    });
                    if (captures.length > 0) {
                        selectedMove = captures[Math.floor(Math.random() * captures.length)];
                    } else if (checks.length > 0) {
                        selectedMove = checks[Math.floor(Math.random() * checks.length)];
                    } else if (centerMoves.length > 0) {
                        selectedMove = centerMoves[Math.floor(Math.random() * centerMoves.length)];
                    } else {
                        selectedMove = moves[Math.floor(Math.random() * moves.length)];
                    }
                    break;
                case 'expert':
                    // More sophisticated: prefer captures, checks, center control, and development
                    const developmentMoves = moves.filter(move => {
                        return move.includes('N') || move.includes('B') || move.includes('O-O');
                    });
                    if (captures.length > 0) {
                        selectedMove = captures[Math.floor(Math.random() * captures.length)];
                    } else if (checks.length > 0) {
                        selectedMove = checks[Math.floor(Math.random() * checks.length)];
                    } else if (centerMoves.length > 0) {
                        selectedMove = centerMoves[Math.floor(Math.random() * centerMoves.length)];
                    } else if (developmentMoves.length > 0) {
                        selectedMove = developmentMoves[Math.floor(Math.random() * developmentMoves.length)];
                    } else {
                        selectedMove = moves[Math.floor(Math.random() * moves.length)];
                    }
                    break;
                default:
                    selectedMove = moves[Math.floor(Math.random() * moves.length)];
            }

            // Make the bot move
            const result = this.chess.move(selectedMove);
            if (result) {
                console.log('Bot move:', selectedMove);
                this.handleMoveResult(result);
                this.moveHistory.push(selectedMove);
                this.render();
                this.updateGameUI();
                this.showToast(`AI played: ${selectedMove}`, 'info');
            }
        } catch (error) {
            console.error('Error making bot move:', error);
        }
    }

    getUnicode(piece) {
        const unicode = {
            k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙",
            K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟"
        };
        return unicode[piece.type] || "";
    }

    updateGameUI() {
        // Update current player display
        if (window.gameUI && window.gameUI.updateCurrentPlayer) {
            window.gameUI.updateCurrentPlayer(this.chess.turn() === 'w');
        }

        // Update move history
        if (window.gameUI && window.gameUI.updateMoveHistory) {
            const moves = this.chess.history();
            window.gameUI.updateMoveHistory(moves);
        }

        // Update captured pieces
        this.updateCapturedPieces();
    }

    updateCapturedPieces() {
        const capturedWhiteElement = document.getElementById('capturedWhite');
        const capturedBlackElement = document.getElementById('capturedBlack');
        
        if (capturedWhiteElement && capturedBlackElement) {
            capturedWhiteElement.innerHTML = '';
            capturedBlackElement.innerHTML = '';

            const pieceValues = { 'q': 5, 'r': 4, 'b': 3, 'n': 2, 'p': 1 };
            
            this.capturedPieces.white.sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);
            this.capturedPieces.black.sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);

            this.capturedPieces.white.forEach(piece => {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'captured-piece white';
                pieceElement.textContent = this.getUnicode(piece);
                capturedWhiteElement.appendChild(pieceElement);
            });

            this.capturedPieces.black.forEach(piece => {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'captured-piece black';
                pieceElement.textContent = this.getUnicode(piece);
                capturedBlackElement.appendChild(pieceElement);
            });
        }
    }

    showToast(message, type = 'info') {
        if (window.gameUI && window.gameUI.showToast) {
            window.gameUI.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Game control methods
    newGame() {
        if (this.moveHistory.length > 0) {
            this.showConfirmationDialog(
                'Start New Game?',
                'Are you sure you want to start a new game? This will reset the current game and all progress will be lost.',
                () => this.confirmNewGame(),
                'Start New Game',
                'Cancel'
            );
        } else {
            this.confirmNewGame();
        }
    }
    
    confirmNewGame() {
        this.chess = new Chess();
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.isGameActive = true;
        
        // Re-enable piece dragging
        const pieces = document.querySelectorAll('.piece');
        pieces.forEach(piece => {
            piece.draggable = true;
            piece.style.cursor = 'grab';
        });
        
        // Remove game over overlay if present
        const existingOverlay = document.getElementById('gameOverOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        this.render();
        this.updateGameUI();
        this.showToast('New game started!', 'success');
    }

    flipBoard() {
        this.boardElement.style.transform = this.boardElement.style.transform === 'rotate(180deg)' 
            ? '' 
            : 'rotate(180deg)';
        this.showToast('Board flipped!', 'info');
    }

    undoMove() {
        if (this.chess.history().length > 0) {
            this.showConfirmationDialog(
                'Undo Last Move?',
                'Are you sure you want to undo the last move? This will take you back one move.',
                () => this.confirmUndoMove(),
                'Undo Move',
                'Cancel'
            );
        } else {
            this.showToast('No moves to undo!', 'error');
        }
    }
    
    confirmUndoMove() {
        if (this.chess.history().length > 0) {
            this.chess.undo();
            this.render();
            this.updateGameUI();
            this.showToast('Move undone!', 'info');
        }
    }

    resignGame() {
        this.showConfirmationDialog(
            'Resign Game?',
            'Are you sure you want to resign? This will end the game and your opponent will win.',
            () => this.confirmResignGame(),
            'Resign Game',
            'Continue Playing'
        );
    }
    
    confirmResignGame() {
        this.showToast('Game resigned!', 'error');
        this.isGameActive = false;
        this.endGame('Resignation');
    }
    
    endGame(result) {
        this.isGameActive = false;
        
        // Disable piece dragging
        const pieces = document.querySelectorAll('.piece');
        pieces.forEach(piece => {
            piece.draggable = false;
            piece.style.cursor = 'not-allowed';
        });
        
        // Show game over message
        let message = '';
        let isWin = false;
        if (result === 'Draw') {
            message = 'Game ended in a draw!';
        } else if (result === 'Stalemate') {
            message = 'Game ended in stalemate!';
        } else if (result === 'Resignation') {
            message = 'Game ended by resignation!';
        } else {
            message = `🎉 Game Over! ${result} wins! 🏆`;
            isWin = true;
        }
        
        // Show firecrackers for wins (not draws or resignations)
        if (isWin) {
            this.playVictorySound();
            this.showFirecrackers();
            this.showConfetti();
        }
        
        // Create game over overlay
        this.showGameOverOverlay(message, result);
        
        // Emit game end event if socket is connected
        if (this.socket) {
            this.socket.emit('gameEnd', { result: result });
        }
        
        console.log(`Game ended: ${result}`);
    }
    
    showGameOverOverlay(message, result) {
        // Remove existing overlay if any
        const existingOverlay = document.getElementById('gameOverOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'gameOverOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        // Create content
        const title = document.createElement('h2');
        title.textContent = 'Game Over!';
        title.style.cssText = `
            color: #333;
            margin-bottom: 1rem;
            font-size: 2rem;
        `;
        
        const resultText = document.createElement('p');
        resultText.textContent = message;
        resultText.style.cssText = `
            color: #666;
            margin-bottom: 2rem;
            font-size: 1.2rem;
        `;
        
        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: center;
        `;
        
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = 'New Game';
        newGameBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
        `;
        newGameBtn.onclick = () => {
            overlay.remove();
            this.newGame();
        };
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
        `;
        closeBtn.onclick = () => overlay.remove();
        
        // Assemble modal
        buttonContainer.appendChild(newGameBtn);
        buttonContainer.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(resultText);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        
        // Add to page
        document.body.appendChild(overlay);
    }
    
    showFirecrackers() {
        // Remove existing firecrackers if any
        const existingFirecrackers = document.getElementById('firecrackers');
        if (existingFirecrackers) {
            existingFirecrackers.remove();
        }
        
        // Create firecrackers container
        const firecrackersContainer = document.createElement('div');
        firecrackersContainer.id = 'firecrackers';
        firecrackersContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        
        // Create multiple firecracker bursts
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createFirecrackerBurst(firecrackersContainer, i);
            }, i * 300);
        }
        
        // Add to page
        document.body.appendChild(firecrackersContainer);
        
        // Remove firecrackers after animation completes
        setTimeout(() => {
            if (firecrackersContainer.parentNode) {
                firecrackersContainer.remove();
            }
        }, 5000);
    }
    
    showConfetti() {
        // Remove existing confetti if any
        const existingConfetti = document.getElementById('confetti');
        if (existingConfetti) {
            existingConfetti.remove();
        }
        
        // Create confetti container
        const confettiContainer = document.createElement('div');
        confettiContainer.id = 'confetti';
        confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            overflow: hidden;
        `;
        
        // Create confetti pieces
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#ffffff'];
        const shapes = ['square', 'circle', 'triangle'];
        
        for (let i = 0; i < 150; i++) {
            setTimeout(() => {
                this.createConfettiPiece(confettiContainer, colors, shapes);
            }, i * 20);
        }
        
        // Add to page
        document.body.appendChild(confettiContainer);
        
        // Remove confetti after animation completes
        setTimeout(() => {
            if (confettiContainer.parentNode) {
                confettiContainer.remove();
            }
        }, 6000);
    }
    
    playVictorySound() {
        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create oscillator for victory sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set up the victory sound (ascending notes)
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            let currentNote = 0;
            
            const playNote = () => {
                if (currentNote < notes.length) {
                    oscillator.frequency.setValueAtTime(notes[currentNote], audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    currentNote++;
                    setTimeout(playNote, 300);
                }
            };
            
            oscillator.start();
            playNote();
            
            // Stop after all notes
            setTimeout(() => {
                oscillator.stop();
            }, 1500);
            
        } catch (error) {
            console.log('Audio not supported or blocked by browser');
        }
    }
    
    showConfirmationDialog(title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel') {
        // Remove existing confirmation dialog if any
        const existingDialog = document.getElementById('confirmationDialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'confirmationDialog';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.3s ease-out;
        `;
        
        // Create content
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.cssText = `
            color: #333;
            margin-bottom: 1rem;
            font-size: 1.5rem;
            font-weight: 600;
        `;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.cssText = `
            color: #666;
            margin-bottom: 2rem;
            font-size: 1rem;
            line-height: 1.5;
        `;
        
        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: center;
        `;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = confirmText;
        confirmBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: background 0.3s ease;
        `;
        confirmBtn.onmouseover = () => confirmBtn.style.background = '#b91c1c';
        confirmBtn.onmouseout = () => confirmBtn.style.background = '#dc2626';
        confirmBtn.onclick = () => {
            overlay.remove();
            onConfirm();
        };
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: background 0.3s ease;
        `;
        cancelBtn.onmouseover = () => cancelBtn.style.background = '#4b5563';
        cancelBtn.onmouseout = () => cancelBtn.style.background = '#6b7280';
        cancelBtn.onclick = () => overlay.remove();
        
        // Add escape key listener
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Assemble modal
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        modal.appendChild(titleElement);
        modal.appendChild(messageElement);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        
        // Add to page
        document.body.appendChild(overlay);
        
        // Focus on cancel button for accessibility
        cancelBtn.focus();
    }
    
    // Multiplayer methods
    createMeeting() {
        if (this.gameMode === 'multiplayer') {
            this.showToast('Already in a multiplayer game!', 'warning');
            return;
        }
        
        // Generate a random meeting ID
        this.meetingId = this.generateMeetingId();
        this.isHost = true;
        this.gameMode = 'multiplayer';
        this.playerRole = 'w'; // Host plays as white
        
        // Update UI
        this.updateMultiplayerUI();
        
        // Join socket room
        if (this.socket) {
            this.socket.emit('createMeeting', { meetingId: this.meetingId });
        }
        
        this.showToast('Meeting created! Share the Meeting ID with your opponent.', 'success');
    }
    
    joinMeeting(meetingId) {
        if (this.gameMode === 'multiplayer') {
            this.showToast('Already in a multiplayer game!', 'warning');
            return;
        }
        
        this.meetingId = meetingId;
        this.isHost = false;
        this.gameMode = 'multiplayer';
        this.playerRole = 'b'; // Guest plays as black
        
        // Update UI
        this.updateMultiplayerUI();
        
        // Join socket room
        if (this.socket) {
            this.socket.emit('joinMeeting', { meetingId: this.meetingId });
        }
        
        this.showToast('Joining meeting...', 'info');
    }
    
    generateMeetingId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    updateMultiplayerUI() {
        const meetingIdDisplay = document.getElementById('meetingIdDisplay');
        const meetingIdElement = document.getElementById('meetingId');
        const playerStatus = document.getElementById('playerStatus');
        const createBtn = document.getElementById('createMeetingBtn');
        const joinBtn = document.getElementById('joinMeetingBtn');
        
        if (this.gameMode === 'multiplayer') {
            // Show meeting ID
            meetingIdDisplay.style.display = 'flex';
            meetingIdElement.textContent = this.meetingId;
            
            // Show player status
            playerStatus.style.display = 'block';
            this.updatePlayerStatus();
            
            // Hide create/join buttons
            createBtn.style.display = 'none';
            joinBtn.style.display = 'none';
        } else {
            // Hide meeting elements
            meetingIdDisplay.style.display = 'none';
            playerStatus.style.display = 'none';
            
            // Show create/join buttons
            createBtn.style.display = 'inline-flex';
            joinBtn.style.display = 'inline-flex';
        }
    }
    
    updatePlayerStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (this.opponentConnected) {
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = `Playing as ${this.playerRole === 'w' ? 'White' : 'Black'}`;
        } else {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'Waiting for opponent...';
        }
    }
    
    leaveMeeting() {
        if (this.socket) {
            this.socket.emit('leaveMeeting', { meetingId: this.meetingId });
        }
        
        this.meetingId = null;
        this.isHost = false;
        this.opponentConnected = false;
        this.gameMode = 'local';
        this.playerRole = null;
        
        this.updateMultiplayerUI();
        this.showToast('Left meeting', 'info');
    }
    
    handleOpponentMove(move, result) {
        // Apply the opponent's move to the local board
        try {
            const moveResult = this.chess.move(move);
            if (moveResult) {
                this.moveHistory.push(move);
                this.render();
                this.updateGameUI();
                this.handleMoveResult(moveResult);
            }
        } catch (error) {
            console.error('Error applying opponent move:', error);
        }
    }
    
    handleRemoteGameEnd(result) {
        // Handle game ending from remote player
        this.isGameActive = false;
        this.endGame(result);
    }
    
    createConfettiPiece(container, colors, shapes) {
        const piece = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const size = 5 + Math.random() * 10;
        const startX = Math.random() * window.innerWidth;
        const endX = startX + (Math.random() - 0.5) * 200;
        const rotation = Math.random() * 360;
        
        let shapeStyle = '';
        if (shape === 'circle') {
            shapeStyle = 'border-radius: 50%;';
        } else if (shape === 'triangle') {
            shapeStyle = `
                width: 0;
                height: 0;
                border-left: ${size/2}px solid transparent;
                border-right: ${size/2}px solid transparent;
                border-bottom: ${size}px solid ${color};
            `;
        }
        
        piece.style.cssText = `
            position: absolute;
            left: ${startX}px;
            top: -10px;
            width: ${shape === 'triangle' ? '0' : size}px;
            height: ${shape === 'triangle' ? '0' : size}px;
            background: ${shape === 'triangle' ? 'transparent' : color};
            ${shapeStyle}
            animation: confettiFall 4s linear forwards;
            transform: rotate(${rotation}deg);
        `;
        
        // Add CSS custom properties for animation
        piece.style.setProperty('--endX', `${endX}px`);
        piece.style.setProperty('--endY', `${window.innerHeight + 10}px`);
        
        container.appendChild(piece);
    }
    
    createFirecrackerBurst(container, burstIndex) {
        const burst = document.createElement('div');
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'];
        const color = colors[burstIndex % colors.length];
        
        // Random position
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        
        burst.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 4px;
            height: 4px;
            background: ${color};
            border-radius: 50%;
            animation: explode 1s ease-out forwards;
        `;
        
        // Create explosion particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            const angle = (i / 12) * 2 * Math.PI;
            const distance = 50 + Math.random() * 50;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            
            particle.style.cssText = `
                position: absolute;
                left: 2px;
                top: 2px;
                width: 3px;
                height: 3px;
                background: ${color};
                border-radius: 50%;
                animation: particle 1s ease-out forwards;
                transform: translate(${endX}px, ${endY}px);
            `;
            
            burst.appendChild(particle);
        }
        
        container.appendChild(burst);
        
        // Add sparkle effect
        setTimeout(() => {
            this.createSparkles(container, x, y, color);
        }, 200);
    }
    
    createSparkles(container, x, y, color) {
        for (let i = 0; i < 6; i++) {
            const sparkle = document.createElement('div');
            const angle = Math.random() * 2 * Math.PI;
            const distance = 20 + Math.random() * 30;
            const endX = x + Math.cos(angle) * distance;
            const endY = y + Math.sin(angle) * distance;
            
            sparkle.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 2px;
                height: 2px;
                background: ${color};
                border-radius: 50%;
                animation: sparkle 0.8s ease-out forwards;
                transform: translate(${endX - x}px, ${endY - y}px);
            `;
            
            container.appendChild(sparkle);
        }
    }
    
    createBasicChessBoard() {
        console.log('Creating basic chess board');
        this.boardElement.innerHTML = '';
        
        // Create a simple 8x8 grid with basic pieces
        const initialBoard = [
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
        ];
        
        for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
            for (let colIndex = 0; colIndex < 8; colIndex++) {
                const squareElement = document.createElement("div");
                squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");
                squareElement.dataset.row = rowIndex;
                squareElement.dataset.col = colIndex;
                
                const pieceCode = initialBoard[rowIndex][colIndex];
                if (pieceCode) {
                    const pieceElement = document.createElement("div");
                    pieceElement.classList.add("piece", pieceCode[0] === 'w' ? "white" : "black");
                    pieceElement.innerText = this.getUnicode({ type: pieceCode[1], color: pieceCode[0] });
                    pieceElement.draggable = true;
                    squareElement.appendChild(pieceElement);
                }
                
                this.boardElement.appendChild(squareElement);
            }
        }
        
        console.log('Basic chess board created');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('No auth token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    console.log('Auth token found, initializing chess game');
    
    // Wait a bit for chess.js to load
    setTimeout(() => {
        // Check if chess.js is loaded
        if (typeof Chess === 'undefined') {
            console.error('Chess.js library not loaded!');
            createBasicChessBoard();
            return;
        }
        
        console.log('Chess.js library loaded successfully');

        // Initialize the chess game
        try {
            window.chessGame = new ChessGame();
            console.log('Chess game initialized successfully');
        } catch (error) {
            console.error('Error initializing chess game:', error);
            createBasicChessBoard();
        }

        // Expose game control functions globally
        window.newGame = () => window.chessGame && window.chessGame.newGame();
        window.flipBoard = () => window.chessGame && window.chessGame.flipBoard();
        window.undoMove = () => window.chessGame && window.chessGame.undoMove();
        window.resignGame = () => window.chessGame && window.chessGame.resignGame();
    }, 500);
});

// Function to create a basic chess board
function createBasicChessBoard() {
    const chessboard = document.getElementById('chessboard');
    if (!chessboard) {
        console.error('Chessboard element not found');
        return;
    }
    
    console.log('Creating basic chess board');
    chessboard.innerHTML = '';
    
    // Create a simple 8x8 grid with pieces
    const pieces = {
        '0,0': '♜', '0,1': '♞', '0,2': '♝', '0,3': '♛', '0,4': '♚', '0,5': '♝', '0,6': '♞', '0,7': '♜',
        '1,0': '♟', '1,1': '♟', '1,2': '♟', '1,3': '♟', '1,4': '♟', '1,5': '♟', '1,6': '♟', '1,7': '♟',
        '6,0': '♙', '6,1': '♙', '6,2': '♙', '6,3': '♙', '6,4': '♙', '6,5': '♙', '6,6': '♙', '6,7': '♙',
        '7,0': '♖', '7,1': '♘', '7,2': '♗', '7,3': '♕', '7,4': '♔', '7,5': '♗', '7,6': '♘', '7,7': '♖'
    };
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.style.width = '62.5px';
            square.style.height = '62.5px';
            square.style.display = 'inline-block';
            square.style.border = '1px solid #ccc';
            square.style.textAlign = 'center';
            square.style.lineHeight = '62.5px';
            square.style.fontSize = '40px';
            square.style.cursor = 'pointer';
            
            const pieceKey = `${row},${col}`;
            if (pieces[pieceKey]) {
                square.textContent = pieces[pieceKey];
                square.style.color = row < 2 ? '#000' : '#fff';
            }
            
            chessboard.appendChild(square);
        }
        chessboard.appendChild(document.createElement('br'));
    }
    
    console.log('Basic chess board created successfully');
}
 

