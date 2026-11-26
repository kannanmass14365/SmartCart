from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

# MySQL Connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="YOUR_MYSQL_PASSWORD",
    database="smartcart"
)

print("MySQL Connected Successfully!")

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "SmartCart Python Backend is running!"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)