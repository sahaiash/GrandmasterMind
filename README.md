# Chess Game with JWT Authentication

A real-time multiplayer chess game with JWT authentication, Google OAuth login, and MongoDB database storage.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 🌐 **Google OAuth** - Login with Google account
- 🗄️ **MongoDB Database** - User data storage with Mongoose
- ♟️ **Real-time Chess** - Multiplayer chess game with Socket.IO
- 🔒 **Protected Routes** - Secure API endpoints
- 👤 **User Profiles** - Track games played and won

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Google OAuth credentials (for Google login)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GrandmasterMind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the `.env` file and update the values:
   ```bash
   cp .env.example .env
   ```

   Update the following variables in `.env`:
   ```env
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/chess_game

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRES_IN=7d

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

   # Session Configuration
   SESSION_SECRET=your_session_secret_key_change_this_in_production

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

## Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (for development)
     - `https://yourdomain.com/auth/google/callback` (for production)

4. **Update environment variables**
   - Copy the Client ID and Client Secret to your `.env` file

## Database Setup

1. **Install MongoDB**
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community

   # On Ubuntu/Debian
   sudo systemctl start mongod

   # On Windows
   net start MongoDB
   ```

3. **Alternative: Use MongoDB Atlas (Cloud)**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a cluster and get your connection string
   - Update `MONGODB_URI` in your `.env` file

## Running the Application

1. **Start the server**
   ```bash
   npm start
   ```

2. **For development (with auto-restart)**
   ```bash
   npm run dev
   ```

3. **Build CSS (if using Tailwind)**
   ```bash
   npm run build:css
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Register a new account or login with Google

## API Endpoints

### Authentication Routes

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile (protected)
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/logout` - Logout user

### Request Examples

**Register User:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login User:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure

```
GrandmasterMind/
├── config/
│   ├── database.js      # MongoDB connection
│   ├── jwt.js          # JWT utilities
│   └── passport.js     # Google OAuth configuration
├── middleware/
│   └── auth.js         # Authentication middleware
├── models/
│   └── User.js         # User model
├── routes/
│   └── auth.js         # Authentication routes
├── public/
│   ├── css/
│   │   ├── styles.css
│   │   └── tailwind.css
│   └── js/
│       └── chessgame.js
├── views/
│   └── index.ejs       # Main page
├── index.js            # Main server file
├── package.json
└── .env               # Environment variables
```

## Security Features

- **Password Hashing** - Passwords are hashed using bcrypt
- **JWT Tokens** - Secure token-based authentication
- **Protected Routes** - Middleware to protect sensitive endpoints
- **Input Validation** - Server-side validation for all inputs
- **CORS Protection** - Configured for security
- **Session Management** - Secure session handling

## Database Schema

### User Model
```javascript
{
  email: String (required, unique),
  password: String (hashed, required for local auth),
  name: String (required),
  googleId: String (unique, for Google OAuth),
  avatar: String (Google profile picture),
  isVerified: Boolean (default: false),
  lastLogin: Date,
  gamesPlayed: Number (default: 0),
  gamesWon: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check your connection string in `.env`
   - Verify network connectivity

2. **Google OAuth Not Working**
   - Check your Google OAuth credentials
   - Verify redirect URIs match exactly
   - Ensure Google+ API is enabled

3. **JWT Token Issues**
   - Check your `JWT_SECRET` in `.env`
   - Verify token expiration settings
   - Check token format in requests

4. **Port Already in Use**
   - Change the port in `.env` file
   - Kill existing processes on port 3000

### Development Tips

- Use `npm run dev` for development with auto-restart
- Check browser console for frontend errors
- Monitor server logs for backend issues
- Use MongoDB Compass for database visualization

## Production Deployment

1. **Environment Variables**
   - Use strong, unique secrets
   - Set `NODE_ENV=production`
   - Use HTTPS URLs for OAuth callbacks

2. **Database**
   - Use MongoDB Atlas or managed MongoDB service
   - Enable database backups
   - Set up monitoring

3. **Security**
   - Use HTTPS
   - Set secure cookie options
   - Implement rate limiting
   - Add CORS configuration

4. **Performance**
   - Enable gzip compression
   - Use CDN for static assets
   - Implement caching strategies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. 