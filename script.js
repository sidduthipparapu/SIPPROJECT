document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const certForm = document.getElementById("certificateForm");

  const API_BASE = "http://localhost:3000"; // 👈 Important fix for cross-origin fetch()

  // 🔹 Student Registration
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rollno = document.getElementById("rollno").value.trim();
      const mobile = document.getElementById("mobile").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      const messageElement = document.getElementById("registerMessage") || document.createElement("p");
      messageElement.id = "registerMessage";
      messageElement.style.color = "blue";
      messageElement.textContent = "Processing registration...";

      if (!registerForm.contains(messageElement)) {
        registerForm.insertAdjacentElement("afterend", messageElement);
      }

      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rollno, mobile, email, password }),
        });

        const data = await res.json();
        console.log("✅ Registration response:", data);

        messageElement.style.color = data.success ? "green" : "red";
        messageElement.textContent = data.message || (data.success ? "Registered successfully!" : "Registration failed!");

        if (data.success) {
          setTimeout(() => {
            window.location.href = "/login.html";
          }, 2000);
        }
      } catch (err) {
        console.error("❌ Registration error:", err);
        messageElement.style.color = "red";
        messageElement.textContent = "Registration failed due to a server error.";
      }
    });
  }

  // 🔹 Student Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rollno = document.getElementById("rollno").value.trim();
      const password = document.getElementById("password").value.trim();

      const messageElement = document.getElementById("loginMessage") || document.createElement("p");
      messageElement.id = "loginMessage";
      messageElement.style.color = "blue";
      messageElement.textContent = "Logging in...";

      if (!loginForm.contains(messageElement)) {
        loginForm.insertAdjacentElement("afterend", messageElement);
      }

      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rollno, password }),
        });

        const data = await res.json();
        console.log("✅ Login response:", data);

        if (res.ok && data.success) {
          messageElement.style.color = "green";
          messageElement.textContent = data.message || "Login successful!";
          localStorage.setItem("token", data.token);

          setTimeout(() => {
            window.location.href = "/student_dashboard.html";
          }, 1000);
        } else {
          messageElement.style.color = "red";
          messageElement.textContent = data.message || "Invalid roll number or password.";
        }
      } catch (err) {
        console.error("❌ Login error:", err);
        messageElement.style.color = "red";
        messageElement.textContent = "Login failed due to a network or server error.";
      }
    });
  }

  // 🔹 Certificate Request
  // 🔹 Certificate Request with File Upload
if (certForm) {
  certForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rollno = document.getElementById("rollno").value.trim();
    const certificateType = document.getElementById("certificate_type").value.trim();
    const reason = document.getElementById("reason").value.trim();
    const fileInput = document.getElementById("certificateFile"); // The file input field for the certificate

    const messageElement = document.getElementById("certMessage") || document.createElement("p");
    messageElement.id = "certMessage";
    messageElement.style.color = "blue";
    messageElement.textContent = "Submitting request...";

    if (!certForm.contains(messageElement)) {
      certForm.insertAdjacentElement("afterend", messageElement);
    }

    // Check if file is selected
    if (!fileInput.files[0]) {
      messageElement.style.color = "red";
      messageElement.textContent = "Please select a certificate file.";
      return;
    }

    // Creating FormData object to handle file upload
    const formData = new FormData();
    formData.append("rollno", rollno);
    formData.append("certificate_type", certificateType);
    formData.append("reason", reason);
    formData.append("certificate", fileInput.files[0]); // Attach the file

    try {
      const res = await fetch(`${API_BASE}/api/request-certificate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`, // Add Authorization token
        },
        body: formData, // Send FormData with the file
      });

      const data = await res.json();
      console.log("✅ Certificate request response:", data);

      messageElement.style.color = data.success ? "green" : "red";
      messageElement.textContent = data.message || 
        (data.success ? "Request submitted!" : "Request failed!");

      if (data.success) certForm.reset(); // Reset form if successful
    } catch (err) {
      console.error("❌ Certificate request error:", err);
      messageElement.style.color = "red";
      messageElement.textContent = "Certificate request failed due to a server error.";
    }
  });
}


  // 🔐 Protected Page Check
  const protectedPages = ["/student_dashboard.html"];
  const currentPage = window.location.pathname;

  if (protectedPages.includes(currentPage)) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login.html";
    }
  }
});
