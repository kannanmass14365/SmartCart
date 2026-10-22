import pytesseract
from PIL import Image, ImageDraw

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# Create a dummy document for testing
image = Image.new("RGB", (700, 200), "white")
draw = ImageDraw.Draw(image)

draw.text(
    (20, 40),
    "SMARTCART TEST DOCUMENT\nSeller: Test User\nStatus: Sample Only",
    fill="black"
)

text = pytesseract.image_to_string(image)

print("OCR extracted text:")
print(text)