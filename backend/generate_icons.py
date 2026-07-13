import os
from PIL import Image, ImageDraw

os.makedirs("frontend-customer/public/icons", exist_ok=True)

def create_icon(size, filename):
    img = Image.new("RGBA", (size, size), (18, 18, 26, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw a stylish rounded rect or circle with gradient colors
    margin = size // 10
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 5,
        fill=(249, 115, 22, 255)
    )
    
    inner_margin = size // 5
    draw.ellipse(
        [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
        fill=(168, 85, 247, 255)
    )
    
    img.save(filename, "PNG")

create_icon(192, "frontend-customer/public/icons/icon-192.png")
create_icon(512, "frontend-customer/public/icons/icon-512.png")
print("Icons created successfully!")
