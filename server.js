import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import CORS middleware
import db from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import colors from 'colors';
import action from './routes/userActionRoutes.js';
import BookAction from './routes/BookRoutes.js';
import bodyParser from 'body-parser';

dotenv.config();
db();

const app = express();
app.use(express.urlencoded({ extended: true }));

// Middleware
app.use(express.json());

// Enable CORS for all routes (you can specify origins if needed)
app.use(cors());

// Root route to show a welcome message
app.get('/', (req, res) => {
    res.send('Welcome to the back end');
});

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/user/actions', action);
app.use('/api/v1/book', BookAction);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
