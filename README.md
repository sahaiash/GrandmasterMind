# GrandmasterMind - Real-time Chess Game

A real-time multiplayer chess game built with Node.js, Socket.IO, and Express. Players can compete against each other in real-time, with features like pawn promotion and game state persistence.

## Features

- 🎮 Real-time multiplayer gameplay
- ♟️ Complete chess rules implementation
- 👥 Support for spectators
- 🎯 Pawn promotion with piece selection
- 💾 Game state persistence
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/sahaiash/GrandmasterMind.git
cd GrandmasterMind
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node index.js
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Game Rules

- The game follows standard chess rules
- When a pawn reaches the opposite end of the board, you can promote it to any piece (Queen, Rook, Bishop, or Knight)
- The game state is preserved between page reloads
- Players are assigned roles (White/Black) automatically
- Additional players can join as spectators

## Technologies Used

- **Backend:**
  - Node.js
  - Express.js
  - Socket.IO
  - chess.js (chess logic)

- **Frontend:**
  - HTML5
  - CSS3 (Tailwind CSS)
  - JavaScript
  - Socket.IO Client

## Project Structure

```
GrandmasterMind/
├── public/
│   ├── css/
│   │   ├── styles.css
│   │   └── tailwind.css
│   └── js/
│       └── chessgame.js
├── views/
│   └── index.ejs
├── index.js
├── package.json
├── tailwind.config.js
└── README.md
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

Ashutosh Sahai
- GitHub: [@sahaiash](https://github.com/sahaiash) 