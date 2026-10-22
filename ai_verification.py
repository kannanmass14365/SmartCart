from flask import Flask, request, jsonify
from PIL import Image
import pytesseract
import io

app = Flask(__name__)

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

@app.route("/verify-document", methods=["POST"])
def verify_document():
    if "document" not in request.files:
        return jsonify({
            "status": "Review Required",
            "message": "Document image is missing."
        }), 400

    file = request.files["document"]

    try:
        image = Image.open(io.BytesIO(file.read())).convert("RGB")
        extracted_text = pytesseract.image_to_string(image)

        if not extracted_text.strip():
            return jsonify({
                "status": "Review Required",
                "message": "Could not read text from the image."
            })

        return jsonify({
            "status": "OCR Complete - Admin Review Required",
            "extracted_text": extracted_text
        })

    except Exception:
        return jsonify({
            "status": "Review Required",
            "message": "Unable to process this image."
        }), 400

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)