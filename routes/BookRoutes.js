import express from 'express';
import User from '../models/User.js';
import userAuth from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import seller from '../middleware/sellerMiddleware.js';
import Book from '../models/book.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const BookAction = express.Router();

//multer for book
const bookStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/book_images');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});
const bookUpload = multer({ storage: bookStorage });

// Create a new book

BookAction.post('/addbook', userAuth, seller, bookUpload.single('book_image'), async (req, res) => {
    try {
        const { isbn, title, publisher, language, category, author, search_tag, no_page, edition, stock, description, price } = req.body;
        const { userId } = req.user;

        // Validate required fields
        if (!isbn || !title || !author || !price) {
            return res.status(400).json({ message: 'ISBN, title, author, and price are required' });
        }

        // Handle book image
        const bookImage = req.file ? req.file.filename : null;

        // Create and save the book
        const book = new Book({
            isbn,
            title,
            publisher,
            language,
            category,
            author,
            search_tag,
            no_page,
            edition,
            stock,
            description,
            price,
            image: bookImage,
            seller: userId
        });

        await book.save();

        res.status(201).json({
            success: true,
            message: 'Book added successfully!',
            data: book
        });
    } catch (error) {
        console.error('Error adding book:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error adding book. Please try again.',
            error: error.message
        });
    }
});
//edit the book
BookAction.put('/editbook/:id', userAuth, seller, bookUpload.single('book_image'), async (req, res) => {
    console.log('Received PUT request for book ID:', req.params.id);
    try {
        const bookId = req.params.id;
        const { isbn, title, publisher, language, category, author, search_tag, no_page, edition, stock, description, price } = req.body;
        const { userId } = req.user;

        // Find the book by ID
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Check if the current user is the seller of the book
        if (book.seller.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to edit this book' });
        }

        // Handle book image update
        if (req.file) {
            // Delete the old image if it exists
            if (book.image) {
                const oldImagePath = path.join(__dirname, '../uploads/book_images', book.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            book.image = req.file.filename;
        }

        // Update the book fields if they are provided
        if (isbn) book.isbn = isbn;
        if (title) book.title = title;
        if (publisher) book.publisher = publisher;
        if (language) book.language = language;
        if (category) book.category = category;
        if (author) book.author = author;
        if (search_tag) book.search_tag = search_tag;
        if (no_page) book.no_page = no_page;
        if (edition) book.edition = edition;
        if (stock) book.stock = stock;
        if (description) book.description = description;
        if (price) book.price = price;

        await book.save();

        res.status(200).json({
            success: true,
            message: 'Book updated successfully!',
            data: book
        });
    } catch (error) {
        console.error('Error updating book:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating book. Please try again.',
            error: error.message
        });
    }
});

//soft delete is_del = true

BookAction.delete('/deletebook/:id', userAuth, seller, async (req, res) => {
    console.log('Received DELETE request for book ID:', req.params.id);
    try {
        const bookId = req.params.id;

        // Find the book by ID
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Check if the current user is the seller of the book
        if (book.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this book' });
        }

        // Soft delete the book
        book.is_del = true;
        await book.save();
        res.status(200).json({
            success: true,
            message: 'Book deleted successfully!'
        });
    }
    catch (error) {
        console.error('Error deleting book:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deleting book. Please try again.',
            error: error.message
        });
    }
});

//View all books uploaded by this seller

BookAction.get('/mybooks', userAuth, seller, async (req, res) => {
    try {
        const { userId } = req.user;

        // Find all books uploaded by the current user
        const books = await Book.find({ seller: userId, is_del: false });
        if (!books) {
            return res.status(404).json({ message: 'No books found' });
        }
        //find no of total books
        const totalBooks = await Book.countDocuments({ seller: userId, is_del: false });
        console.log("Total books:", totalBooks);


        res.status(200).json({
            success: true,
            message: 'Books fetched successfully!',
            data: books
        });
    } catch (error) {
        console.error('Error fetching books:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching books. Please try again.',
            error: error.message
        });
    }
});
//view all books
BookAction.get('/books', async (req, res) => {
    try {
        // Optional: Apply filters, pagination, or sorting
        const filters = { is_del: false }; // Only fetch books that are not deleted

        // Find all books
        const books = await Book.find(filters);

        if (books.length === 0) {
            return res.status(404).json({ message: 'No books found' });
        }

        // Find the total number of books
        const totalBooks = await Book.countDocuments(filters);
        console.log("Total books:", totalBooks);

        res.status(200).json({
            success: true,
            message: 'Books fetched successfully!',
            data: books,
            totalBooks: totalBooks
        });
    } catch (error) {
        console.error('Error fetching books:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching books. Please try again.',
            error: error.message
        });
    }
});



//Add Stock 

BookAction.put('/addstock/:id', userAuth, seller, async (req, res) => {
    console.log('Received PUT request for book ID:', req.params.id);
    try {
        const bookId = req.params.id;
        const { stock } = req.body;
        //check if stock is given
        if (!stock) {
            return res.status(400).json({ message: 'Stock is required' });
        }


        if (stock) {
            console.log("Stock to add:", stock);


            // Find the book by ID
            const book = await Book.findById(bookId);
            if (!book) {
                return res.status(404).json({ message: 'Book not found' });
            }

            // Check if the current user is the seller of the book
            if (book.seller.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'You are not authorized to add stock to this book' });
            }

            // Add stock to the book
            book.stock += stock;

            await book.save();
            res.status(200).json({
                success: true,
                message: 'Stock added successfully!',
                data: book
            });
        }

    }
    catch (error) {
        console.error('Error adding stock:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error adding stock. Please try again.',
            error: error.message
        });
    }
});
// send mail to user
/* BookAction.get('/sendmail', userAuth, async (req, res) => {
    console.log('Received GET request for sending mail');
    try {
        const { userId } = req.user;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Send email to user
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.email,
            subject: 'mail test',
            text: ""
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending mail:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error sending mail. Please try again.',
                    error: error.message
                });
            }
            console.log('Email sent: ', info.response);
            res.status(200).json({
                success: true,
                message: 'Email sent successfully!'
            });
        });


    }
    catch (error) {
        console.error('Error sending mail:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error sending mail. Please try again.',
            error: error.message
        });
    }






});
 */




export default BookAction;



