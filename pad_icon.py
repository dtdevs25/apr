from PIL import Image

# Load the original image
img_path = r"c:\Users\Daniel\Desktop\Lider-em-Acao\icone.png"
img = Image.open(img_path).convert("RGBA")

# Determine square size
size = max(img.size)

# Create a new square image with a transparent background
square_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))

# Calculate position to center the original image
x = (size - img.width) // 2
y = (size - img.height) // 2

# Paste the original image
square_img.paste(img, (x, y))

# Save it to src/app/icon.png
square_img.save(r"c:\Users\Daniel\Desktop\Lider-em-Acao\apr-dashboard\src\app\icon.png")
print("Saved proportional icon to src/app/icon.png")
