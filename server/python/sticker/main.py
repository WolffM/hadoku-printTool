#!/usr/bin/env python3
import os
import sys
import argparse
import shutil
from datetime import datetime
from removeBG import remove_background_from_images
import drawCutline
from PIL import Image, ImageDraw, ImageFont
import glob

# Define the offset sizes options
OFFSET_SIZES = {
    1: 0.05,
    2: 0.1, 
    3: 0.15,
    4: 0.2
}

def ensure_directory_structure():
    """Ensure all needed directories exist."""
    # Input directories
    os.makedirs('Input', exist_ok=True)
    os.makedirs('Input/bgRemoved', exist_ok=True)
    os.makedirs('Input/Finished', exist_ok=True)
    
    # Output directories
    os.makedirs('Output', exist_ok=True)
    os.makedirs('Output/Finished', exist_ok=True)

def process_raw_images():
    """Process raw images by removing backgrounds and returning paths to processed images."""
    print("\n=== BACKGROUND REMOVAL ===")
    if not os.listdir('Input/raw'):
        print("No raw images found in Input/raw. Skipping background removal.")
        return []
    
    return remove_background_from_images(
        input_folder='Input/raw',
        output_folder='Input/bgRemoved',
        history_folder='Input/Finished'
    )

def add_transparent_padding(input_folder):
    """
    Add transparent padding around all images in the input folder.
    Uses a fixed padding of 0.2 inches.
    
    Args:
        input_folder: Folder containing images to process
    """
    print("\n=== ADDING TRANSPARENT PADDING ===")
    
    # Fixed padding of 0.2 inches
    padding_inches = 0.2
    
    # Convert inches to pixels based on DPI defined in drawCutline
    padding_px = int(padding_inches * drawCutline.DPI)
    processed_count = 0
    
    for filename in os.listdir(input_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            input_path = os.path.join(input_folder, filename)
            
            try:
                # Open image and ensure it has an alpha channel
                img = Image.open(input_path)
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Create a new larger transparent image
                old_width, old_height = img.size
                new_width = old_width + (2 * padding_px)
                new_height = old_height + (2 * padding_px)
                
                padded_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
                
                # Paste the original image centered in the new image
                padded_img.paste(img, (padding_px, padding_px))
                
                # Save the padded image, overwriting the original
                padded_img.save(input_path)
                processed_count += 1
                
            except Exception as e:
                print(f"Error adding padding to {filename}: {e}")
    
    print(f"Added {padding_inches} inches of padding to {processed_count} images")

def process_cutlines(copies=1, offset_size=2, custom_offset=None):
    """
    Process images with removed backgrounds and draw cutlines.
    
    Args:
        copies: Number of copies per image
        offset_size: Size option for cutline offset (1-4)
        custom_offset: Custom offset value in inches (overrides offset_size)
    """
    print("\n=== DRAWING CUTLINES ===")
    
    # Check if bgRemoved directory has images
    if not any(f.lower().endswith(('.png', '.jpg', '.jpeg')) for f in os.listdir('Input/bgRemoved')):
        print("No images found in Input/bgRemoved. Skipping cutline drawing.")
        return False
    
    # Store original input folder
    original_input = drawCutline.INPUT_FOLDER
    
    # Change input folder to use our bgRemoved directory
    drawCutline.INPUT_FOLDER = './Input/bgRemoved/'
    
    # Get the offset value in inches
    if custom_offset is not None:
        offset_in = custom_offset
    else:
        offset_in = OFFSET_SIZES.get(offset_size, 0.1)  # Default to 0.1 if invalid size
    
    # Set copies in sys.argv for drawCutline
    original_argv = sys.argv.copy()
    sys.argv = ['drawCutline.py', str(copies), str(offset_in)]
    
    try:
        # Run the cutline drawing process
        result = drawCutline.main()
        print(f"Cutlines drawn successfully with offset size {offset_in} inches")
    except Exception as e:
        print(f"Error during cutline drawing: {e}")
        result = False
    finally:
        # Restore original settings
        drawCutline.INPUT_FOLDER = original_input
        sys.argv = original_argv
    
    return result

def create_test_page():
    """
    Create a test page with 4 different cutline offset sizes.
    Returns the path to the test page image.
    """
    print("\n=== CREATING TEST PAGE ===")
    
    # Check if bgRemoved directory has images
    if not any(f.lower().endswith(('.png', '.jpg', '.jpeg')) for f in os.listdir('Input/bgRemoved')):
        print("No images found in Input/bgRemoved. Cannot create test page.")
        return None
    
    # Get the first image in bgRemoved
    for filename in os.listdir('Input/bgRemoved'):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            img_path = os.path.join('Input/bgRemoved', filename)
            break
    else:
        print("No valid images found in Input/bgRemoved.")
        return None
    
    # Create temp directory for test images
    temp_dir = os.path.join('Output', 'test_samples')
    os.makedirs(temp_dir, exist_ok=True)
    
    # Process the same image with 4 different offset sizes
    test_images = []
    
    # Store original input folder
    original_input = drawCutline.INPUT_FOLDER
    
    try:
        for size_option in range(1, 5):  # Changed from 1-6 to 1-5
            offset_in = OFFSET_SIZES[size_option]
            
            # Create a copy in a temp folder
            temp_path = os.path.join(temp_dir, f"test_{size_option}.png")
            
            # Process image with cutline
            img = Image.open(img_path)
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
                
            # Create a new transparent image for the cutline
            w, h = img.size
            cutline_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(cutline_img)
            
            # Draw the cutline with current offset size
            nodes_pass1, original_mask = drawCutline.pass1_crude_outline(img, offset_in=offset_in, step_px=15)
            nodes_pass2 = drawCutline.refine_outline(nodes_pass1, original_mask, max_iterations=5)
            nodes_smoothed = drawCutline.smooth_outline(nodes_pass2, iterations=2)
            
            if len(nodes_smoothed) > 1:
                draw.line(nodes_smoothed, fill='green', width=3)
            
            # Composite the image with cutline
            result_img = Image.alpha_composite(img, cutline_img)
            
            # Add a label showing the offset size (now at the bottom of each image)
            label_img = Image.new('RGBA', (w, h + 40), (0, 0, 0, 0))
            label_draw = ImageDraw.Draw(label_img)
            
            try:
                # Try to use a font, with fallback
                font_path = None
                if os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
                    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
                elif os.path.exists('C:\\Windows\\Fonts\\Arial.ttf'):
                    font_path = 'C:\\Windows\\Fonts\\Arial.ttf'
                
                if font_path:
                    font = ImageFont.truetype(font_path, 24)
                    label_draw.text((10, h + 5), f"{offset_in} inches", font=font, fill=(0, 0, 0, 255))
                else:
                    # Fallback to default font
                    label_draw.text((10, h + 5), f"{offset_in} inches", fill=(0, 0, 0, 255))
            except Exception as e:
                # Just draw text without font specification if there's an error
                label_draw.text((10, h + 5), f"{offset_in} inches", fill=(0, 0, 0, 255))
            
            # Paste the result onto the label image
            label_img.paste(result_img, (0, 0))
            
            # Save the test image
            label_img.save(temp_path)
            test_images.append((size_option, temp_path))
    finally:
        # Restore original input folder
        drawCutline.INPUT_FOLDER = original_input
    
    # Create a page showing all 4 test images
    if not test_images:
        return None
    
    # Calculate the total dimensions for the test page
    sample_img = Image.open(test_images[0][1])
    sample_width, sample_height = sample_img.size
    
    # Create a test page with all samples arranged horizontally instead of vertically
    page_height = sample_height + 60  # Height for one row of samples plus title area
    page_width = (sample_width * len(test_images)) + 40  # Width for all samples side by side
    
    test_page = Image.new('RGB', (page_width, page_height), 'white')
    
    # Add a title at the top
    draw = ImageDraw.Draw(test_page)
    try:
        # Try to use a font, with fallback
        font_path = None
        if os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
            font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
        elif os.path.exists('C:\\Windows\\Fonts\\ArialBD.ttf'):
            font_path = 'C:\\Windows\\Fonts\\ArialBD.ttf'
        
        if font_path:
            font = ImageFont.truetype(font_path, 24)
            draw.text((20, 5), "Cutline Offset Size Samples", font=font, fill='black')
        else:
            # Fallback to default font
            draw.text((20, 5), "Cutline Offset Size Samples", fill='black')
    except Exception:
        # Just draw text without font specification if there's an error
        draw.text((20, 5), "Cutline Offset Size Samples", fill='black')
    
    # Paste each sample image horizontally
    current_x = 20  # Start with some margin
    current_y = 40  # Position after the title
    
    for _, img_path in test_images:
        img = Image.open(img_path)
        # Create a white background image
        white_bg = Image.new('RGB', img.size, 'white')
        # Paste the image with transparency onto the white background
        white_bg.paste(img, (0, 0), img if img.mode == 'RGBA' else None)
        # Paste the result onto the test page
        test_page.paste(white_bg, (current_x, current_y))
        current_x += sample_width  # Move to the right for the next image
    
    # Save the test page
    out_file = os.path.join('Output', 'cutline_test_page.jpg')
    test_page.save(out_file, 'JPEG', dpi=(drawCutline.DPI, drawCutline.DPI))
    print(f"Test page created: {out_file}")
    
    return out_file

def move_processed_to_history():
    """Move processed bgRemoved images to Input/Finished folder."""
    print("\n=== ARCHIVING PROCESSED IMAGES ===")
    
    finished_dir = 'Input/Finished'
    os.makedirs(finished_dir, exist_ok=True)
    
    processed_count = 0
    bg_removed_dir = 'Input/bgRemoved'
    
    # Check if there are files to process
    image_files = [f for f in os.listdir(bg_removed_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not image_files:
        print("No images found in Input/bgRemoved to archive.")
        return
    
    for filename in image_files:
        src_path = os.path.join(bg_removed_dir, filename)
        
        # Check if destination file already exists, add number if needed
        base_name, extension = os.path.splitext(filename)
        dst_filename = filename
        counter = 1
        
        while os.path.exists(os.path.join(finished_dir, dst_filename)):
            dst_filename = f"{base_name}_{counter}{extension}"
            counter += 1
        
        dst_path = os.path.join(finished_dir, dst_filename)
        
        try:
            shutil.move(src_path, dst_path)
            processed_count += 1
            print(f"Archived: {filename} → {dst_filename}")
        except Exception as e:
            print(f"Error moving file {filename}: {e}")
    
    print(f"Moved {processed_count} processed images to Finished folder.")

def move_output_files_to_finished():
    """Move existing output files to the Output/Finished directory."""
    print("\n=== ARCHIVING EXISTING OUTPUT FILES ===")
    output_files = glob.glob(os.path.join('Output', "*.jpg"))
    moved_count = 0
    
    for output_file in output_files:
        if os.path.dirname(output_file) == 'Output':  # Only process files directly in Output folder
            filename = os.path.basename(output_file)
            
            # Check if destination file already exists, add number if needed
            dest_path = os.path.join('Output/Finished', filename)
            base_name, extension = os.path.splitext(filename)
            counter = 1
            
            while os.path.exists(dest_path):
                dest_path = os.path.join('Output/Finished', f"{base_name}_{counter}{extension}")
                counter += 1
            
            # Move the file
            try:
                shutil.move(output_file, dest_path)
                moved_count += 1
                print(f"Moved {filename} to Output/Finished folder")
            except Exception as e:
                print(f"Error moving output file {filename}: {e}")
    
    if moved_count > 0:
        print(f"Moved {moved_count} existing output files to Output/Finished folder")
    else:
        print("No existing output files to archive")

def main():
    """Main function to run the complete sticker creation pipeline."""
    parser = argparse.ArgumentParser(description='Sticker Maker Pipeline')
    parser.add_argument('--copies', type=int, default=1,
                      help='Number of copies per image for cutline drawing (default: 1)')
    parser.add_argument('--size', type=int, choices=range(1, 5), default=2,
                      help='Cutline offset size: 1=0.05in, 2=0.1in (default), 3=0.15in, 4=0.2in')
    parser.add_argument('--offset', type=float,
                      help='Custom cutline offset in inches (0.01-0.5). Overrides --size if specified.')
    parser.add_argument('--test', action='store_true',
                      help='Generate a test page with 4 different cutline offset sizes')
    
    args = parser.parse_args()
    copies = args.copies
    offset_size = args.size
    custom_offset = args.offset
    test_mode = args.test
    
    # Validate custom offset if specified
    if custom_offset is not None:
        if custom_offset < 0.01 or custom_offset > 0.5:
            print(f"WARNING: Custom offset {custom_offset} is outside the recommended range (0.01-0.5).")
            print("Continuing with the specified value, but results may be suboptimal.")
    
    print("=== STICKER MAKER PIPELINE ===")
    if test_mode:
        print("Running in TEST MODE - generating cutline size samples")
    else:
        print(f"Using {copies} copies per image")
        if custom_offset is not None:
            print(f"Using custom cutline offset: {custom_offset} inches")
        else:
            print(f"Using cutline offset size {offset_size} ({OFFSET_SIZES[offset_size]} inches)")
    
    ensure_directory_structure()
    
    # Archive existing output files
    move_output_files_to_finished()
    
    # Process raw images (always do this step)
    process_raw_images()
    
    # Add padding to images in bgRemoved
    add_transparent_padding('Input/bgRemoved')
    
    if test_mode:
        # In test mode, create a test page with different cutline offset sizes
        test_page = create_test_page()
        if test_page:
            print("\n=== TEST PAGE CREATED ===")
            print(f"Test page saved to: {test_page}")
            print("To use a specific size, run the pipeline with one of:")
            print("  - python main.py --copies <num> --size <1-4>")
            print("  - python main.py --copies <num> --offset <custom_value>")
    else:
        # Normal mode - process images with specified copies and offset size
        process_cutlines(copies, offset_size, custom_offset)
        move_processed_to_history()
        print("\n=== PIPELINE COMPLETE ===")
        print("Stickers ready in Output folder.")

if __name__ == "__main__":
    main() 