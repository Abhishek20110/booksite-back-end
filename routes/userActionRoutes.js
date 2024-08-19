import express from 'express';
import User from '../models/User.js';
import userAuth from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import seller from '../middleware/sellerMiddleware.js';
import Book from '../models/book.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const action = express.Router();
const upload = multer({ storage: storage });

// Update user
action.put('/update', upload.none(), userAuth, async (req, res) => {
    try {
        const { name, email, phone, zip } = req.body;
        const { userId } = req.user;

        // Validate input
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'Name, email, and phone are required' });
        }


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the email exists
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== userId.toString()) {
            return res.status(400).json({ message: 'Email is already taken by another user' });
        }

        // Update user fields
        user.name = name;
        user.email = email;
        user.phone = phone;
        if (zip) {
            user.zip = zip;
        }
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully!',
            data: user
        });
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating user. Please try again.',
            error: error.message
        });
    }
});

// Update password
action.put('/updatepass', upload.none(), userAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword, conPassword } = req.body;
        const { userId } = req.user;

        // Verify user ID
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Verify new password and confirm password
        if (!newPassword || !conPassword) {
            return res.status(400).json({ message: 'New password and confirm password are required' });
        }
        if (newPassword !== conPassword) {
            return res.status(400).json({ message: 'New password and confirm password do not match' });
        }

        // Verify password
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.password !== currentPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully!'
        });
    } catch (error) {
        console.error('Error updating password:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating password. Please try again.',
            error: error.message
        });
    }
});

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/profile_pictures');
        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename using userId and current timestamp
        const uniqueSuffix = `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});



// Update profile picture
action.put('/updatepic', userAuth, upload.single('profile_picture'), async (req, res) => {
    try {
        const { userId } = req.user;

        // Verify user ID
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Check if file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'Profile picture is required' });
        }

        // Generate the file path
        const profilePicturePath = `${req.file.filename}`;

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete the old profile picture if it exists
        if (user.profile_picture) {
            const oldPath = path.join(__dirname, '../uploads/profile_pictures', user.profile_picture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Update user profile picture path in the database
        user.profile_picture = profilePicturePath;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture updated successfully!',
            data: user
        });
    } catch (error) {
        console.error('Error updating profile picture:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating profile picture. Please try again.',
            error: error.message
        });
    }
});

//manage store information
action.put('/updatestoreinfo', userAuth, seller, async (req, res) => {
    try {
        const {
            outletname,
            pin,
            legal_entity,
            owner,
            cc_number,
            contact_name,
            outlet_add,
            gst,
            delevery_radius,
            billing_amount_anydel,
            min_amount,
            reg_add
        } = req.body;
        const { userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update only the fields that are present in the request body
        if (outletname !== undefined) user.outletname = outletname;
        if (pin !== undefined) user.pin = pin;
        if (legal_entity !== undefined) user.legal_entity = legal_entity;
        if (owner !== undefined) user.owner = owner;
        // if (phone !== undefined) user.phone = phone;
        if (cc_number !== undefined) user.cc_number = cc_number;
        /*  if (email !== undefined) user.email = email; */
        if (contact_name !== undefined) user.contact_name = contact_name;
        if (outlet_add !== undefined) user.outlet_add = outlet_add;
        if (gst !== undefined) user.gst = gst;
        if (delevery_radius !== undefined) user.delevery_radius = delevery_radius;
        if (billing_amount_anydel !== undefined) user.billing_amount_anydel = billing_amount_anydel;
        if (min_amount !== undefined) user.min_amount = min_amount;
        if (reg_add !== undefined) user.reg_add = reg_add;

        // Save the updated user object
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Store information updated successfully!',
            data: user
        });
    } catch (error) {
        console.error('Error updating store information:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating store information. Please try again.',
            error: error.message
        });
    }
});

//add book




// Add book route with file upload handling





export default action;
