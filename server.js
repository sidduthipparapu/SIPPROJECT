/***************************************************
// server.js - Final Updated Version
***************************************************/
require('dotenv').config();
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const db = require('./db');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;
app.use(cors({
    origin: 'http://127.0.0.1:5501', // Allow frontend URL to access the backend
    methods: ['GET', 'POST'], // Allow GET and POST methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow necessary headers
}));

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (frontend and uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.resolve(__dirname, '../frontend')));

// Ensure the uploads/certificates folder exists
const uploadDir = path.resolve(__dirname, '../uploads/certificates');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage (for certificate uploads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Set file size limit (10MB) and validate file types (only images/PDF)
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
});

// Configure nodemailer using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE === 'gmail' ? 'smtp.gmail.com' : '',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    ignoreTLS: process.env.EMAIL_IGNORE_TLS === 'true',
    auth: {
        user: process.env.EMAIL_USER, // set in .env
        pass: process.env.EMAIL_PASS  // set in .env
    },
    tls: {
        rejectUnauthorized: false
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Connection Error:', {
            code: error.code,
            command: error.command,
            response: error.response
        });
    } else {
        console.log('SMTP Server Ready');
    }
});

// =======================================
// ROUTES

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Serve the Login Page
app.get('/login.html', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/login.html'));
});

// =========================
// Student Registration
app.post('/api/register', (req, res) => {
    const { rollno, mobile, password, email } = req.body;
    const trimmedRollno = rollno?.trim().toLowerCase();
    const trimmedEmail = email?.trim().toLowerCase();

    if (!trimmedRollno || !trimmedEmail || !mobile || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    console.log('Registration attempt:', { rollno: trimmedRollno, email: trimmedEmail });
    const checkSql = 'SELECT * FROM stu WHERE LOWER(rollno) = ? OR LOWER(email) = ?';

    db.query(checkSql, [trimmedRollno, trimmedEmail], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ DB check error:', checkErr);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (checkResults.length > 0) {
            if (checkResults.some(row => row.rollno.trim().toLowerCase() === trimmedRollno)) {
                return res.json({ success: false, message: 'Roll number already registered!' });
            } else if (checkResults.some(row => row.email.trim().toLowerCase() === trimmedEmail)) {
                return res.json({ success: false, message: 'Email already registered!' });
            } else {
                return res.json({ success: false, message: 'Student already exists!' });
            }
        }

        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error('❌ Hash error:', hashErr);
                return res.status(500).json({ success: false, message: 'Password encryption failed' });
            }

            const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const insertSql = 'INSERT INTO stu (rollno, mobile, password, email, created_at) VALUES (?, ?, ?, ?, ?)';

            db.query(insertSql, [trimmedRollno, mobile, hashedPassword, trimmedEmail, created_at], (insertErr) => {
                if (insertErr) {
                    console.error('❌ DB insert error:', insertErr);
                    return res.status(500).json({ success: false, message: 'Registration failed' });
                }

                res.json({ success: true, message: 'Registration successful!' });

                // Send registration email
                try {
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: trimmedEmail,
                        subject: 'Registration Successful',
                        text: `Hi ${trimmedRollno},\n\nYou have successfully registered for the certificate system.\n\nRegards,\nAdmin`
                    };

                    transporter.sendMail(mailOptions, (emailErr) => {
                        if (emailErr) {
                            console.error('❌ Email sending error:', emailErr);
                        } else {
                            console.log('✅ Registration email sent.');
                        }
                    });
                } catch (emailErr) {
                    console.error('❌ Email setup error:', emailErr);
                }
            });
        });
    });
});

// =========================
// Student Login Route
app.post('/api/login', (req, res) => {
    const rollno = req.body.rollno.trim().toLowerCase();
    const password = req.body.password.trim();
    const sql = 'SELECT * FROM stu WHERE LOWER(rollno) = ?';

    db.query(sql, [rollno], (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid roll number or password' });
        }

        const user = results[0];

        bcrypt.compare(password, user.password, (bcryptErr, isMatch) => {
            if (bcryptErr) {
                console.error('Password comparison error:', bcryptErr);
                return res.status(500).json({ success: false, message: 'Password verification failed' });
            }

            if (isMatch) {
                // Use environment variable for JWT secret if available
                const token = jwt.sign({ rollno: rollno }, process.env.JWT_SECRET || 'secretKey', { expiresIn: '1h' });
                return res.json({
                    success: true,
                    message: 'Login successful',
                    token: token,
                    redirect: '/student_dashboard.html'
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid roll number or password' });
            }
        });
    });
});

// =========================
// Certificate Request Route (Student)
app.post('/api/request-certificate', (req, res) => {
    const rollno = req.body.rollno?.trim().toLowerCase();
    const certificate_type = req.body.certificate_type?.trim();
    const reason = req.body.reason?.trim();
    const status = 'Pending';

    if (!rollno || !certificate_type || !reason) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const sql = 'INSERT INTO cert_req (rollno, certificate_type, reason, status) VALUES (?, ?, ?, ?)';
    db.query(sql, [rollno, certificate_type, reason, status], (err) => {
        if (err) {
            console.error("Certificate request DB error:", err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, message: 'Certificate request submitted successfully.' });
    });
});

// =========================
// Get Student Certificate Status
app.get('/api/cert-status/:rollno', (req, res) => {
    const rollno = req.params.rollno?.trim().toLowerCase();
    if (!rollno) {
        return res.status(400).json({ message: 'Roll number is required.' });
    }
    const sql = 'SELECT certificate_type, reason, status, certificateUrl FROM cert_req WHERE LOWER(rollno) = ? ORDER BY id DESC';
    db.query(sql, [rollno], (err, results) => {
        if (err) {
            console.error('Certificate status fetch error:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(results);
    });
});

// =========================
// Management Login
app.post('/api/mgmt-login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM mgmt WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        if (results.length > 0) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// =========================
// Get All Certificate Requests (Management Dashboard)
app.get('/api/cert-requests', (req, res) => {
    const sql = 'SELECT * FROM cert_req';
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: 'Server error' });
        }
        res.json(results);
    });
});

// =========================
// Approve Certificate Request + Email
app.post('/api/approve-request', (req, res) => {
    const { id, reason } = req.body;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }

    // Update certificate request record
    const updateSql = 'UPDATE cert_req SET status = "Approved", reason = ? WHERE id = ?';
    db.query(updateSql, [reason, requestId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        // Fetch student email and certificate type for email notification
        const getEmailSql = `
            SELECT stu.email, cert_req.certificate_type 
            FROM cert_req 
            JOIN stu ON cert_req.rollno = stu.rollno 
            WHERE cert_req.id = ?
        `;

        db.query(getEmailSql, [requestId], (emailErr, emailResult) => {
            if (emailErr || !emailResult[0]) {
                console.error('Email lookup failed:', emailErr);
                return res.json({
                    success: true,
                    message: 'Approved but email not sent (student not found)'
                });
            }

            const { email, certificate_type } = emailResult[0];

            const mailOptions = {
                from: `"SIP System" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `Certificate Approved: ${certificate_type}`,
                html: `<p>Your certificate request for ${certificate_type} has been approved. Please download your certificate from your dashboard.</p>`,
                attachments: [{
                    filename: `${certificate_type}_certificate.pdf`,
                    path: path.join(__dirname, '../uploads/certificates', `${requestId}.pdf`),
                    contentType: 'application/pdf'
                }]
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error('Email failed:', error);
                    return res.json({
                        success: true,
                        message: 'Approved but email failed to send'
                    });
                }
                res.json({
                    success: true,
                    message: 'Approved and email sent successfully'
                });
            });
        });
    });
});

// =========================
// Reject Certificate Request + Email Notification
app.post('/api/reject-request', (req, res) => {
    const { id, reason } = req.body;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID.' });
    }
    if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const updateSql = 'UPDATE cert_req SET status = "Rejected", reason = ? WHERE id = ?';
    db.query(updateSql, [reason, requestId], (err, result) => {
        if (err) {
            console.error("❌ DB update error (rejection):", err);
            return res.status(500).json({ message: 'Failed to update request status.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No such request found.' });
        }

        const getEmailSql = `
            SELECT stu.email, cert_req.certificate_type 
            FROM cert_req 
            JOIN stu ON cert_req.rollno = stu.rollno 
            WHERE cert_req.id = ?
        `;

        db.query(getEmailSql, [requestId], (emailErr, emailResult) => {
            if (emailErr || emailResult.length === 0) {
                console.error('❌ Email fetch error (rejection):', emailErr);
                return res.json({ message: 'Request rejected, but email not sent.' });
            }

            const { email, certificate_type } = emailResult[0];
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Certificate Request Rejected',
                text: `Hi,\n\nYour request for the "${certificate_type}" certificate has been rejected.\nReason: ${reason}\n\nRegards,\nAdmin`
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error('❌ Email error (rejection):', error);
                    return res.json({ message: 'Request rejected, email failed.' });
                }
                res.json({ message: 'Request rejected and email sent successfully.' });
            });
        });
    });
});

// =========================
// Forgot Password - Send Reset Link
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const sql = 'SELECT * FROM stu WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Email not found' });
        }

        // Create a token that expires in 1 hour. Use env variable if available.
        const token = jwt.sign({ email }, process.env.JWT_SECRET || 'resetPasswordSecret', { expiresIn: '1h' });
        const resetLink = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: `Click the link to reset your password: ${resetLink}`
        };

        transporter.sendMail(mailOptions, (emailErr) => {
            if (emailErr) {
                console.error('Error sending email:', emailErr);
                return res.status(500).json({ success: false, message: 'Failed to send reset link' });
            }
            res.json({ success: true, message: 'Password reset link sent successfully' });
        });
    });
});

// Serve Reset Password Page
app.get('/reset-password', (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(400).json({ message: 'Invalid or expired token' });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET || 'resetPasswordSecret');
        res.sendFile(path.resolve(__dirname, '../frontend/reset-password.html'));
    } catch (err) {
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

// Update Password
app.post('/api/reset-password', (req, res) => {
    const { token, newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'resetPasswordSecret');
        const email = decoded.email;
        bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                return res.status(500).json({ message: 'Error hashing password' });
            }
            const updateSql = 'UPDATE stu SET password = ? WHERE email = ?';
            db.query(updateSql, [hashedPassword, email], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error updating password' });
                }
                res.json({ message: 'Password updated successfully' });
            });
        });
    } catch (err) {
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

// =========================
// Certificate File Upload Endpoint (Management)
app.post('/api/upload-certificate', upload.single('certificate'), async (req, res) => {
    try {
        const { requestId } = req.body;
        if (!requestId || !req.file) {
            return res.status(400).json({
                success: false,
                message: !requestId ? 'Request ID required' : 'Certificate file required'
            });
        }
        const certificateUrl = `/uploads/certificates/${req.file.filename}`;
        const [updateResult] = await db.promise().query(
            `UPDATE cert_req SET status="Approved", certificateUrl=? WHERE id=?`,
            [certificateUrl, requestId]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        // Email sending removed per requirements

        return res.json({ success: true, message: 'Certificate uploaded successfully' });
    } catch (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Serve Management Dashboard
app.get('/management_dashboard.html', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/management_dashboard.html'));
});

// Serve Student Dashboard
app.get('/student_dashboard.html', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/student_dashboard.html'));
});

app.get('/download-certificate/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);
    res.download(filepath, filename, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).send('Could not download the file.');
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
