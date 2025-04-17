document.addEventListener("DOMContentLoaded", () => {
  // Fetch certificate requests to populate the table
  fetch("http://localhost:3000/api/cert-requests")
    .then((res) => res.json())
    .then((data) => {
      const table = document.querySelector("#requestsTable tbody");
      table.innerHTML = ""; // Clear previous rows

      data.forEach((req) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${req.id}</td>
          <td>${req.rollno}</td>
          <td>${req.certificate_type}</td>
          <td>${req.reason}</td>
          <td>${req.status || "Pending"}</td>
          <td>
            <button onclick="handleAction(${req.id}, 'approve')">Approve</button>
            <button onclick="handleAction(${req.id}, 'reject')">Reject</button>
          </td>
        `;
        table.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("❌ Error fetching certificate requests:", err);
      alert("Failed to load certificate requests.");
    });
});

// Function to handle approve and reject actions
function handleAction(id, action) {
  // Prompt the manager for a reason if rejecting
  const reason = prompt(`Please provide a reason for the ${action}:`);
  if (reason === null || reason.trim() === "") {
    alert("Reason is required.");
    return;
  }

  const endpoint =
    action === "approve"
      ? "http://localhost:3000/api/approve-request"
      : "http://localhost:3000/api/reject-request";

  console.log(`Sending ${action} request for ID: ${id} with reason: ${reason}`);

  // Make the API request to update the status
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, reason }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Server error");
      return res.json();
    })
    .then((data) => {
      alert(data.message || `${action}d successfully`);
      location.reload(); // Reload the page to reflect changes
    })
    .catch((err) => {
      console.error(`Error on ${action}:`, err);
      alert(`Failed to ${action} request.`);
    });
}
