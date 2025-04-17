require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing with:', process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user:' nanisiddu078@gmail.com',  
      pass: 'brctxxtkfpkpdoby'
  },
  tls: { rejectUnauthorized: false }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP FAILED:', {
      code: error.code,
      command: error.command,
      response: error.response
    });
    process.exit(1);
  } else {
    console.log('✅ SMTP Verified');
    process.exit(0);
  }
});
