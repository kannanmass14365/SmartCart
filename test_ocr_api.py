import requests
from PIL import Image, ImageDraw
from io import BytesIO

# Create a sample document
image = Image.new("RGB", (700, 200), "white")
draw = ImageDraw.Draw(image)

draw.text(
    (20, 40),
    "SMARTCART TEST DOCUMENT\nSeller: Test User\nStatus: Sample Only",
    fill="black"
)

# Convert image to bytes
image_bytes = BytesIO()
image.save(image_bytes, format="PNG")
image_bytes.seek(0)

# Send the sample image to the OCR API
response = requests.post(
    "http://127.0.0.1:5000/verify-document",
    files={"document": ("test.png", image_bytes, "image/png")}
)

print("API Status:", response.status_code)
print("API Response:", response.text)