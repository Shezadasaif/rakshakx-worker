// Load environment variables
require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const db = require('./db'); // Your SQLite or real DB connection

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// -------------------
// 1️⃣ Create Razorpay Order
// -------------------
app.post('/create-order', async (req, res) => {
    const { amount, email } = req.body;

    if (!amount || !email) {
        return res.status(400).json({ error: 'Amount and email required' });
    }

    try {
        // Receipt can be user email + timestamp
        const receipt = `receipt_${email}_${Date.now()}`;

        const options = {
            amount: amount * 100, // Razorpay expects paise
            currency: 'INR',
            receipt,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        console.log("Order created successfully:", order);

        // Save order in DB for tracking (optional)
        db.run(
            'INSERT INTO users (email, premium) VALUES (?, 0) ON CONFLICT(email) DO NOTHING',
            [email],
            function(err) {
                if (err) console.error(err);
            }
        );

        res.json(order);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).send('Error creating order');
    }
});

// -------------------
// 2️⃣ Verify Payment
// -------------------
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        console.log('Payment verified successfully:', razorpay_payment_id);

        // Update user as premium
        db.run(
            'UPDATE users SET premium = 1 WHERE email = ?',
            [email],
            function(err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: 'error updating premium' });
                }
                res.json({ status: 'success', premium: true });
            }
        );
    } else {
        console.log('Payment verification failed');
        return res.status(400).json({ status: 'failure' });
    }
});

// -------------------
// Start server
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`RakshakX worker running on port ${PORT}`));
