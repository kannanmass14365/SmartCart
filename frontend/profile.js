function showMessage(message) {
    const messageElement = document.getElementById("profileMessage");

    if (messageElement) {
        messageElement.textContent = message;
    }
}

// Open Edit Profile in a NEW PAGE
function editProfile() {
    const phone = prompt("Enter your registered phone number:");

    if (!phone) {
        return;
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
        showMessage("Please enter a valid 10-digit phone number.");
        return;
    }

    window.location.href =
        `/edit-profile.html?phone=${encodeURIComponent(phone.trim())}`;
}

// Other profile menu functions
function cancelEdit() {
    window.location.href = "profile.html";
}

function manageAddresses() {
    showMessage("Saved Addresses - Address management coming soon!");
}

function viewOrders() {
    showMessage("My Orders - Your order history will appear here.");
}

function viewWishlist() {
    showMessage("My Wishlist - Your saved products will appear here.");
}

function showPrivacy() {
    showMessage("Privacy & Security - Keep your account details safe.");
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        window.location.href = "index.html";
    }
}