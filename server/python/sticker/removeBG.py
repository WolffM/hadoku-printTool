import os
import shutil
from rembg import remove
from PIL import Image

def remove_background_from_images(input_folder='Input/raw', 
                                  output_folder='Input/bgRemoved', 
                                  history_folder='Input/Finished'):
    """
    Remove background from all images in input_folder and save results in output_folder.
    Then move original images to history_folder.
    
    Returns:
        list: Paths to processed images in output_folder
    """
    # Ensure output and history directories exist
    os.makedirs(output_folder, exist_ok=True)
    os.makedirs(history_folder, exist_ok=True)
    
    processed_images = []

    # Loop through each file in the input folder
    for file_name in os.listdir(input_folder):
        # Only process common image file types
        if file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            input_path = os.path.join(input_folder, file_name)
            
            # Generate output filename with timestamp to prevent overwrites
            base_name, ext = os.path.splitext(file_name)
            output_file = f"{base_name}_{os.path.getmtime(input_path):.0f}{ext}"
            output_path = os.path.join(output_folder, output_file)
            
            # Check if destination file already exists, add number if needed
            history_path = os.path.join(history_folder, file_name)
            counter = 1
            orig_base_name = base_name
            while os.path.exists(history_path):
                base_name_with_num = f"{orig_base_name}_{counter}"
                history_path = os.path.join(history_folder, f"{base_name_with_num}{ext}")
                counter += 1
            
            print(f"Processing {file_name}...")

            # Open the image
            with Image.open(input_path) as input_image:
                # Remove background
                output_image = remove(input_image)
                
                # Save the processed image as PNG to retain transparency
                if ext.lower() != '.png':
                    output_path = os.path.splitext(output_path)[0] + '.png'
                    
                output_image.save(output_path)
                processed_images.append(output_path)

            # Move the original file to history folder
            shutil.move(input_path, history_path)
            
            print(f"Saved processed image to {output_path} and moved original to {history_path}")
    
    return processed_images

if __name__ == "__main__":
    remove_background_from_images()
