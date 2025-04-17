// forgot-password.js

document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the default form submission
    const email = document.getElementById('email').value.trim();
    const button = e.target.querySelector('button');
    const msgElem = document.getElementById('forgotMsg');
    button.disabled = true;
    msgElem.style.color = 'blue';
    msgElem.textContent = 'Sending reset link...';

    try {
        const response = await fetch('http://localhost:3000/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (result.success) {
            msgElem.style.color = 'green';
            msgElem.textContent = 'Reset link sent! Please check your email.';
        } else {
            msgElem.style.color = 'red';
            msgElem.textContent = result.message || 'Failed to send reset link.';
        }
    } catch (error) {
        console.error('Error:', error);
        msgElem.style.color = 'red';
        msgElem.textContent = 'An error occurred. Please try again.';
    } finally {
        button.disabled = false;
    }
});
