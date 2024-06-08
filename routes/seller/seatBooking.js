const db = require("../../db/db_seller.js");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodeMailer = require("../customer/emailSender.js");
const auth = require("../../middleWare/seller_middleWare.js");
const multer = require("multer");
const { Mutex } = require('async-mutex');
const schedule = require('node-schedule');
const env = require("dotenv");
const router = express.Router();
env.config({ path: "config.env" });

const storage = multer.memoryStorage(); // Store the file in memory as a Buffer
const upload = multer({ storage: storage });

// Create a map to store locks for each seat and email combination
const seatLocks = new Map();

router.post("/seller/shop/bookSeat", async (req, res) => {
    try {
        const email = req.body.email;
        const seatNumber = parseInt(req.body.seatNumber);
        const slot = parseInt(req.body.slot);

        // Generate a unique key for the seat and email combination
        const lockKey = `${email}_${seatNumber}_${slot}`;

        // Get or create a lock for the specific seat and email combination
        if (!seatLocks.has(lockKey)) {
            seatLocks.set(lockKey, new Mutex());
        }

        // Use the seat-specific lock to ensure only one request can access the critical section at a time
        const seatMutex = seatLocks.get(lockKey);
        const release = await seatMutex.acquire();

        try {
            var findSeat = await db.seat.findOne({ email, seatNumber });
            console.log(findSeat);
            if (findSeat) {
                if (findSeat.bookings[slot]) {
                    findSeat.bookings[slot] = false;
                    await findSeat.save();
                    res.status(200).json({ message: "Seat booked successfully" });
                } else {
                    res.status(400).json({ message: "Seat not booked" });
                }
            } else {
                res.status(404).json({ message: "Error in bookings" });
            }
        } finally {
            // Release the seat-specific lock to allow other requests to access the critical section
            release();
        }
    } catch (error) {
        res.status(400).send(error);
    }
});


// Function to clear all bookings at the end of the day
const clearBookings = async () => {
  try {
    // Find and update all seats to free status
    await db.seat.updateMany({}, {bookings: new Array(10).fill(true) });
    console.log('Bookings cleared for the day.');
  } catch (error) {
    console.error(error);
  }
};

// Schedule the clearBookings function to run at midnight
const clearBookingsJob = schedule.scheduleJob('0 0 * * *', clearBookings);


module.exports = router;