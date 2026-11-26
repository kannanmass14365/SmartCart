require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const app = express();
app.use(cors());
app.use(express.json());
app.post("/google-login", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: "Google credential missing"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload.email_verified) {
            return res.status(401).json({
                success: false,
                message: "Google email is not verified"
            });
        }

        const sql = `
            INSERT INTO google_users
            (google_id, full_name, email, profile_picture)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                email = VALUES(email),
                profile_picture = VALUES(profile_picture)
        `;

        db.query(
            sql,
            [
                payload.sub,
                payload.name,
                payload.email,
                payload.picture || null
            ],
            (err, result) => {
                if (err) {
                    console.error("Google DB Error:", err.message);

                    return res.status(500).json({
                        success: false,
                        message: "Database save failed"
                    });
                }

                res.json({
                    success: true,
                    message: "Google Login Successful",
                    user: {
                        googleId: payload.sub,
                        name: payload.name,
                        email: payload.email,
                        picture: payload.picture
                    }
                });
            }
        );

    } catch (error) {
        console.error("Google Login Error:", error.message);

        res.status(401).json({
            success: false,
            message: "Google Authentication Failed"
        });
    }
});


app.post("/email-register", async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const sql = `
            INSERT INTO email_users
            (full_name, email, password_hash)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [full_name.trim(), email.trim().toLowerCase(), passwordHash],
            (err, result) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            success: false,
                            message: "Email already registered"
                        });
                    }

                    console.error("Registration DB Error:", err.message);

                    return res.status(500).json({
                        success: false,
                        message: "Registration failed"
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "Registration successful"
                });
            }
        );

    } catch (error) {
        console.error("Registration Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.post("/email-login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password required"
        });
    }

    const sql = `
        SELECT id, full_name, email, password_hash
        FROM email_users
        WHERE email = ?
    `;

    db.query(sql, [email.trim().toLowerCase()], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email
            }
        });
    });
});

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/Login.html")
    );
});
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/edit-profile.html", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/edit-profile.html")
    );
});

const uploadDir = path.join(__dirname, "private-uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Serve seller product images
app.get("/seller-product-image/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const imagePath = path.join(uploadDir, filename);

    res.sendFile(imagePath, (err) => {
        if (err && !res.headersSent) {
            res.status(404).json({
                message: "Product image not found."
            });
        }
    });
});

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" +
            Math.round(Math.random() * 1000000) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// PAN and Aadhaar OCR verification
async function checkImageWithOcr(file, documentType) {
    const form = new FormData();

    form.append("document", fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype
    });

    form.append("document_type", documentType);

    try {
        const response = await axios.post(
            "http://127.0.0.1:5000/verify-document",
            form,
            {
                headers: form.getHeaders(),
                timeout: 15000
            }
        );

        console.log(
            `${documentType.toUpperCase()} OCR RESULT:`,
            response.data
        );

        return response.data;

    } catch (error) {
        console.error("OCR connection error:", error.message);
        console.error("OCR error code:", error.code);
        console.error("OCR response:", error.response?.data);
        throw error;
    }
}

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "KS28@krhps",
    database: "smartcart"
});

// Check database connection
db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");
});

// Test API
app.get("/", (req, res) => {
    res.send("SmartCart backend is running!");
});

// Save order
app.post("/save-order", (req, res) => {
    const {
        productName,
        productImage,
        price,
        paymentMethod
    } = req.body;

    if (!productName || price == null || !paymentMethod) {
        return res.status(400).json({
            message: "Missing order details"
        });
    }

    const sql = `
        INSERT INTO orders
        (
            product_name,
            product_image,
            price,
            payment_method,
            order_status
        )
        VALUES (?, ?, ?, ?, 'Order Placed')
    `;

    db.query(
        sql,
        [
            productName,
            productImage || "",
            price,
            paymentMethod
        ],
        (err, result) => {
            if (err) {
                console.log("Order save error:", err.message);

                return res.status(500).json({
                    message: "Failed to save order"
                });
            }

            res.json({
                message: "Order saved successfully!",
                orderId: result.insertId
            });
        }
    );
});

// Save customer details
app.post("/save-customer", (req, res) => {
    const { fullName, phone, address } = req.body;

    if (
        !fullName?.trim() ||
        !/^[0-9]{10}$/.test(phone || "") ||
        !address?.trim()
    ) {
        return res.status(400).json({
            message: "Please enter valid name, phone and address."
        });
    }

    const checkSql =
        "SELECT customer_id FROM customers WHERE phone = ?";

    db.query(checkSql, [phone], (checkError, results) => {
        if (checkError) {
            console.error(
                "Customer check error:",
                checkError.message
            );

            return res.status(500).json({
                message: "Database error while checking customer."
            });
        }

        if (results.length > 0) {
            return res.status(409).json({
                message: "This phone number is already registered."
            });
        }

        const insertSql = `
            INSERT INTO customers (full_name, phone, address)
            VALUES (?, ?, ?)
        `;

        db.query(
            insertSql,
            [
                fullName.trim(),
                phone,
                address.trim()
            ],
            (insertError, result) => {
                if (insertError) {
                    console.error(
                        "Customer save error:",
                        insertError.message
                    );

                    return res.status(500).json({
                        message: "Failed to save customer details."
                    });
                }

                return res.status(201).json({
                    message: "Customer details saved successfully!",
                    customerId: result.insertId
                });
            }
        );
    });
});

// Basic customer login
app.post("/customer-login", (req, res) => {
    const { fullName, phone } = req.body;

    if (!fullName?.trim() || !/^[0-9]{10}$/.test(phone || "")) {
        return res.status(400).json({
            message: "Please enter a valid name and phone number."
        });
    }

    const sql = `
        SELECT customer_id, full_name, phone, address
        FROM customers
        WHERE phone = ? AND LOWER(full_name) = LOWER(?)
    `;

    db.query(sql, [phone, fullName.trim()], (error, results) => {
        if (error) {
            console.error("Login error:", error.message);

            return res.status(500).json({
                message: "Database error during login."
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Customer not found. Please register first."
            });
        }

        return res.json({
            message: "Login successful!",
            customer: results[0]
        });
    });
});

// Get customer by phone
app.get("/customer/:phone", (req, res) => {
    const phone = req.params.phone;

    db.query(
        `SELECT customer_id, full_name, phone, address
         FROM customers WHERE phone = ?`,
        [phone],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Customer not found"
                });
            }

            res.json(results[0]);
        }
    );
});

// Get customer by ID
app.get("/customer-by-id/:id", (req, res) => {
    const customerId = req.params.id;

    db.query(
        `SELECT customer_id, full_name, phone, address
         FROM customers WHERE customer_id = ?`,
        [customerId],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Customer not found"
                });
            }

            res.json(results[0]);
        }
    );   
});

// Update customer details
app.put("/update-customer/:id", (req, res) => {
    const customerId = req.params.id;
    const { fullName, phone, address } = req.body;

    if (
        !/^[0-9]+$/.test(customerId) ||
        !fullName?.trim() ||
        !/^[0-9]{10}$/.test(phone || "") ||
        !address?.trim()
    ) {
        return res.status(400).json({
            message: "Please enter valid name, phone and address."
        });
    }

    const sql = `
        UPDATE customers
        SET full_name = ?, phone = ?, address = ?
        WHERE customer_id = ?
    `;

    db.query(
        sql,
        [
            fullName.trim(),
            phone,
            address.trim(),
            customerId
        ],
        (err, result) => {
            if (err) {
                console.error(
                    "Customer update error:",
                    err.message
                );

                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message:
                            "This phone number is already registered."
                    });
                }

                return res.status(500).json({
                    message: "Database update failed."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Customer not found."
                });
            }

            res.json({
                message:
                    "Customer details updated successfully!"
            });
        }
    );
});

// Get all orders
app.get("/my-orders", (req, res) => {
    const sql = `
        SELECT
            order_id,
            product_name,
            product_image,
            price,
            payment_method,
            order_status,
            order_date
        FROM orders
        ORDER BY order_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log("Fetch orders error:", err.message);

            return res.status(500).json({
                message: "Failed to load orders"
            });
        }

        res.json(results);
    });
});

// Update order status
app.put("/update-order-status/:id", (req, res) => {
    const { status } = req.body;

    const allowedStatuses = [
        "Order Placed",
        "Confirmed",
        "Shipped",
        "Out for Delivery",
        "Delivered"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid order status"
        });
    }

    const sql = `
        UPDATE orders
        SET order_status = ?
        WHERE order_id = ?
    `;

    db.query(
        sql,
        [status, req.params.id],
        (err, result) => {
            if (err) {
                console.log(
                    "Status update error:",
                    err.message
                );

                return res.status(500).json({
                    message: "Failed to update order status"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            res.json({
                message: "Order status updated successfully",
                status: status
            });
        }
    );
});

// Seller registration with PAN/Aadhaar OCR
app.post(
    "/seller-register",
    upload.fields([
        { name: "pan", maxCount: 1 },
        { name: "aadhaar", maxCount: 1 },
        { name: "productImage", maxCount: 1 }
    ]),
    async (req, res) => {
        const {
            sellerName,
            phone,
            productName,
            price
        } = req.body;

        const files = req.files || {};

        if (
            !sellerName?.trim() ||
            !/^[0-9]{10}$/.test(phone || "") ||
            !productName?.trim() ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0 ||
            !files.pan?.[0] ||
            !files.aadhaar?.[0] ||
            !files.productImage?.[0]
        ) {
            return res.status(400).json({
                message:
                    "Please check all seller details and files."
            });
        }

        try {
            const panResult = await checkImageWithOcr(
                files.pan[0],
                "pan"
            );

            const aadhaarResult = await checkImageWithOcr(
                files.aadhaar[0],
                "aadhaar"
            );

            console.log("PAN OCR:", panResult);
            console.log("Aadhaar OCR:", aadhaarResult);

            const sql = `
                INSERT INTO sellers (
                    seller_name,
                    phone,
                    pan_document_path,
                    aadhaar_document_path,
                    product_name,
                    product_image_path,
                    product_price,
                    verification_status,
                    pan_format_check_passed,
                    aadhaar_format_check_passed,
                    pan_ocr_message,
                    aadhaar_ocr_message
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
            `;

            const values = [
                sellerName.trim(),
                phone,
                files.pan[0].filename,
                files.aadhaar[0].filename,
                productName.trim(),
                files.productImage[0].filename,
                Number(price),
                panResult.format_check_passed === true,
                aadhaarResult.format_check_passed === true,
                panResult.message || "OCR result unavailable",
                aadhaarResult.message || "OCR result unavailable"
            ];

            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error(
                        "Seller registration error:",
                        err
                    );

                    return res.status(500).json({
                        message: "Could not save seller details."
                    });
                }

                return res.status(201).json({
                    message:
                        "Seller submitted. Verification pending.",
                    sellerId: result.insertId,
                    status: "Pending",
                    panOCR: panResult,
                    aadhaarOCR: aadhaarResult
                });
            });

        } catch (error) {
            console.error("OCR error:", error.message);

            return res.status(503).json({
                message:
                    "AI OCR service is unavailable. Please try again."
            });
        }
    }
);

// Admin: Get all sellers
// Combined into one route to avoid duplicate /admin/sellers handlers.
app.get("/admin/sellers", (req, res) => {
    const sql = `
        SELECT
            seller_id,
            seller_name,
            phone,
            pan_document_path,
            aadhaar_document_path,
            product_name,
            product_image_path,
            product_price,
            verification_status
        FROM sellers
        ORDER BY seller_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching sellers:", err);

            return res.status(500).json({
                message: "Could not load seller details."
            });
        }

        res.json(results);
    });
});

// Admin: Approve or reject seller
app.put("/admin/seller/:id", (req, res) => {
    const { status } = req.body;
    const sellerId = req.params.id;

    if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
            message: "Invalid seller status."
        });
    }

    const sql = `
        UPDATE sellers
        SET verification_status = ?
        WHERE seller_id = ?
    `;

    db.query(
        sql,
        [status, sellerId],
        (err, result) => {
            if (err) {
                console.error("Error updating seller:", err);

                return res.status(500).json({
                    message: "Could not update seller status."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Seller not found."
                });
            }

            res.json({
                message:
                    `Seller ${status.toLowerCase()} successfully.`,
                status
            });
        }
    );
});

// Start server
app.listen(3000, "0.0.0.0", () => {
    console.log("SmartCart server running on port 3000");
});