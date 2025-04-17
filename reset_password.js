// reset-password.js

document.getElementById('reset-password-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!newPassword || !token) {
        alert("Invalid token or password.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });

        const data = await response.json();
        if (data.success) {
            alert('Password reset successfully.');
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            alert(data.message || 'Failed to reset password.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to reset password.');
    }
});
