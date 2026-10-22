from flask import Flask, request, jsonify
from PIL import Image
import pytesseract
import io
import re

app = Flask(__name__)

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


@app.route("/")
def home():
    return "SmartCart AI Verification API is running!"


@app.route("/verify-document", methods=["POST"])
def verify_document():

    if "document" not in request.files:
        return jsonify({
            "status": "Review Required",
            "message": "Document image is missing."
        }), 400

    document_type = request.form.get(
        "document_type", ""
    ).strip().lower()

    if document_type not in ["pan", "aadhaar"]:
        return jsonify({
            "status": "Review Required",
            "message": "Document type must be PAN or Aadhaar."
        }), 400

    try:
        file = request.files["document"]

        image = Image.open(
            io.BytesIO(file.read())
        ).convert("RGB")

        extracted_text = pytesseract.image_to_string(
            image
        ).upper()

        # Check whether OCR extracted any text
        if not extracted_text.strip():
            return jsonify({
                "status": "Review Required",
                "format_check_passed": False,
                "message": "No readable text found."
            })

        # PAN format check
        if document_type == "pan":

            pan_pattern = r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"

            format_passed = bool(
                re.search(pan_pattern, extracted_text)
            )

        # Aadhaar number format check
        else:
            aadhaar_pattern = r"(?<!\d)[2-9]\d{3}\s?\d{4}\s?\d{4}(?!\d)"

            format_passed = bool(
                re.search(
                    aadhaar_pattern,
                    extracted_text
                )
            )

        if format_passed:
            message = (
                "Expected format detected. "
                "Admin review required."
            )
        else:
            message = (
                "Expected format not detected. "
                "Please review the document."
            )

        return jsonify({
            "status": "Pending Admin Review",
            "document_type": document_type,
            "text_found": True,
            "format_check_passed": format_passed,
            "message": message
        })

    except Exception:
        return jsonify({
            "status": "Review Required",
            "format_check_passed": False,
            "message": "Unable to process the image."
        }), 400


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )