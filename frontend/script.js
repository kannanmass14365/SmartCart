let cart = [];

function addToCart(button) {
    const product = button.closest(".product-card");

    if (!product) {
        alert("Product not found!");
        return;
    }

    const name = product.querySelector("h3").textContent.trim();
    const image = product.querySelector("img").src;

    const priceText = product
        .querySelector(".price")
        .childNodes[0].textContent.trim();

    const price = Number(priceText.replace(/[₹,]/g, ""));

    if (!name || !price || !image) {
        alert("Product details are missing!");
        return;
    }

    const selectedProduct = {
        name: name,
        image: image,
        price: price
    };

    // Save product details
    sessionStorage.setItem(
        "smartcartSelectedProduct",
        JSON.stringify(selectedProduct)
    );

    // Go to payment page
    window.location.href = "payment.html";
}

// Search products
function searchProducts() {
    const input = document
        .getElementById("searchInput")
        .value.toLowerCase()
        .trim();

    const products = document.querySelectorAll(".product-card");
    let found = 0;

    products.forEach(function(product) {
        const name = product
            .querySelector("h3")
            .textContent.toLowerCase();

        if (name.includes(input)) {
            product.style.display = "";
            found++;
        } else {
            product.style.display = "none";
        }
    });

    document.getElementById("emptyMessage").hidden = found !== 0;
}

// Filter products by category
function filterCategory(category) {
    const products = document.querySelectorAll(".product-card");
    let found = 0;

    products.forEach(function(product) {
        const productCategory = product.dataset.category;

        if (category === "All" || productCategory === category) {
            product.style.display = "";
            found++;
        } else {
            product.style.display = "none";
        }
    });

    document.getElementById("emptyMessage").hidden = found !== 0;

    // Clear search text after selecting a category
    document.getElementById("searchInput").value = "";
}

// Search when pressing Enter
document.getElementById("searchInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        searchProducts();
    }
});

// Open product overview
document.querySelectorAll(".product-card").forEach(function(product) {
    product.style.cursor = "pointer";

    product.addEventListener("click", function(event) {

        // Add to Cart button click-a overview click-ah treat panna vendam
        if (event.target.closest("button")) {
            return;
        }

        const name = product.querySelector("h3").textContent;
        const price = product.querySelector(".price")?.textContent || "";
        const rating = product.querySelector(".rating")?.textContent || "";
        const image = product.querySelector("img").src;
        const category = product.dataset.category;

        document.getElementById("overviewName").textContent = name;
        document.getElementById("overviewPrice").textContent = price;
        document.getElementById("overviewRating").textContent = rating;
        document.getElementById("overviewImage").src = image;

        document.getElementById("overviewDescription").textContent =
            name + " - Explore this product on SmartCart.";

        // Related products from same category
        const relatedArea = document.getElementById("relatedProducts");
        relatedArea.innerHTML = "";

        document.querySelectorAll(".product-card").forEach(function(item) {
            if (
                item.dataset.category === category &&
                item.querySelector("h3").textContent !== name
            ) {
                relatedArea.appendChild(item.cloneNode(true));
            }
        });

        // Hide product list and show overview
        document.getElementById("productGrid").hidden = true;
        document.getElementById("productOverview").hidden = false;

        document.getElementById("overviewAddButton").onclick = function() {
            cartCount++;
            document.getElementById("cartCount").textContent = cartCount;
            alert("Product added to cart successfully! 🛒");
        };

        document.getElementById("productOverview").scrollIntoView({
            behavior: "smooth"
        });
    });
});

// Close overview
function closeOverview() {
    document.getElementById("productOverview").hidden = true;
    document.getElementById("productGrid").hidden = false;
}

function openCustomerForm() {
    document.getElementById("customerForm").hidden = false;
}

function closeCustomerForm() {
    document.getElementById("customerForm").hidden = true;
}

document.getElementById("registrationForm").addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const address = document.getElementById("address").value.trim();

        if (!fullName || !/^[0-9]{10}$/.test(phone) || !address) {
            alert("Please enter valid customer details.");
            return;
        }

        alert("Details entered successfully! Next, we will connect OTP.");
    }
);


function showMyOrder() {
    window.location.href = "myorders.html";
}