import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import CORS middleware
import db from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import action from './routes/userActionRoutes.js';
import BookAction from './routes/BookRoutes.js';
import colors from 'colors';

dotenv.config();
db();

const app = express();

// Middleware
app.use(express.json()); // Built-in body parser for JSON
app.use(express.urlencoded({ extended: true })); // Built-in body parser for URL-encoded data
app.use(cors()); // Enable CORS for all routes (you can specify origins if needed)

// Root route to show a welcome message
app.get('/', (req, res) => {
    res.send('Welcome to the back end');
});

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/user/actions', action);
app.use('/api/v1/book', BookAction);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again later.',
        error: err.message
    });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`.cyan.bold);
});
