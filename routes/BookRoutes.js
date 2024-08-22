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
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();
console.log("Cloudinary Name:", process.env.CLOUDINARY_NAME);
console.log("Cloudinary API Key:", process.env.CLOUDINARY_API_KEY);
console.log("Cloudinary API Secret:", process.env.CLOUDINARY_API_SECRET);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BookAction = express.Router();

// Add a new book
BookAction.post('/addbook', userAuth, seller, upload.single('book_image'), async (req, res) => {
    try {
        const { isbn, title, publisher, language, category, author, search_tag, no_page, edition, stock, description, price } = req.body;
        const { userId } = req.user;

        // Validate required fields
        if (!isbn || !title || !author || !price) {
            return res.status(400).json({ message: 'ISBN, title, author, and price are required' });
        }

        let bookImageUrl = null;

        // Handle book image upload to Cloudinary
        if (req.file) {
            const result = await cloudinary.uploader.upload_stream(
                { folder: 'book_images' },
                (error, result) => {
                    if (error) {
                        return res.status(500).json({ message: 'Error uploading image to Cloudinary', error });
                    }
                    bookImageUrl = result.public_id;
                }
            ).end(req.file.buffer);
        }

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
            image: bookImageUrl,
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

// Edit the book
BookAction.put('/editbook/:id', userAuth, seller, upload.single('book_image'), async (req, res) => {
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

        // Handle book image update with Cloudinary
        if (req.file) {
            // Delete the old image from Cloudinary if it exists
            if (book.image) {
                const publicId = book.image.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`book_images/${publicId}`);
            }

            // Upload the new image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'book_images'
            });
            book.image = result.secure_url;
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



