#!/usr/bin/env python3
import os
import sys
import math
import glob
import shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

###############################################################################
# CONFIGURATION
###############################################################################
DPI = 300
PAGE_WIDTH_IN = 8.5
PAGE_HEIGHT_IN = 11
PAGE_WIDTH_PX = int(PAGE_WIDTH_IN * DPI)
PAGE_HEIGHT_PX = int(PAGE_HEIGHT_IN * DPI)

MIN_IMAGE_IN = 1.0
MIN_IMAGE_PX = int(MIN_IMAGE_IN * DPI)
MARGIN_IN = 0.1

INPUT_FOLDER = './Input/'
OUTPUT_FOLDER = './Output/'
FINISHED_FOLDER = os.path.join(INPUT_FOLDER, 'Finished')

###############################################################################
# HELPER FUNCTIONS (GRID/DISTRIBUTION, I/O)
###############################################################################

def load_input_images():
    patterns = ['*.jpg', '*.jpeg', '*.png', '*.bmp', '*.gif']
    images = []
    for pattern in patterns:
        images.extend(glob.glob(os.path.join(INPUT_FOLDER, pattern)))
    return images

def choose_grid(image_sizes, margin_px):
    """
    Calculate optimal grid layout based on actual image sizes.
    
    Args:
        image_sizes: List of (width, height) tuples for each image
        margin_px: Margin between images in pixels
    
    Returns:
        Tuple of (cols, rows, positions) where positions is a list of (x, y) coordinates
    """
    total_count = len(image_sizes)
    
    # Try different numbers of columns to find optimal layout
    best_scale = 0
    best_layout = None
    
    max_cols = min(total_count, int(PAGE_WIDTH_IN / (MIN_IMAGE_IN + MARGIN_IN)))
    
    for cols in range(1, max_cols + 1):
        rows = math.ceil(total_count / cols)
        
        # Calculate maximum width and height in each column/row
        col_widths = []
        row_heights = []
        
        # Initialize with minimum sizes (will be updated if images are larger)
        for _ in range(cols):
            col_widths.append(0)
        for _ in range(rows):
            row_heights.append(0)
        
        # Assign each image to its position and track max sizes
        for idx in range(total_count):
            col = idx % cols
            row = idx // cols
            w, h = image_sizes[idx]
            col_widths[col] = max(col_widths[col], w)
            row_heights[row] = max(row_heights[row], h)
        
        # Calculate total width and height needed
        total_width = sum(col_widths) + (cols + 1) * margin_px
        total_height = sum(row_heights) + (rows + 1) * margin_px
        
        # Calculate scaling factor to fit on page, ensuring margins are preserved
        # Reserve space for margins by subtracting them from available space
        available_width = PAGE_WIDTH_PX - (2 * margin_px)  # Left and right margin
        available_height = PAGE_HEIGHT_PX - (2 * margin_px)  # Top and bottom margin
        
        # Calculate content scale (excluding margins)
        content_width = total_width - (2 * margin_px)
        content_height = total_height - (2 * margin_px)
        
        width_scale = available_width / content_width if content_width > 0 else 1
        height_scale = available_height / content_height if content_height > 0 else 1
        scale = min(width_scale, height_scale, 1.0)
        
        # Check if this layout is better than previous best
        if scale > best_scale:
            best_scale = scale
            
            # Calculate positions for each image
            positions = []
            
            # Start with margin on left
            x_offsets = [margin_px]
            for i in range(cols):
                if i > 0:
                    x_offsets.append(x_offsets[i-1] + col_widths[i-1] * scale + margin_px)
            
            # Start with margin on top
            y_offsets = [margin_px]
            for i in range(rows):
                if i > 0:
                    y_offsets.append(y_offsets[i-1] + row_heights[i-1] * scale + margin_px)
            
            # Ensure we have enough space for bottom margin by checking the last row
            if rows > 0 and y_offsets[-1] + row_heights[-1] * scale + margin_px > PAGE_HEIGHT_PX:
                # Adjust scale if needed to ensure bottom margin fits
                max_y = y_offsets[-1] + row_heights[-1] * scale
                if max_y + margin_px > PAGE_HEIGHT_PX:
                    scale_adjustment = (PAGE_HEIGHT_PX - margin_px) / max_y
                    scale = scale * scale_adjustment
                    
                    # Recalculate offsets with adjusted scale
                    x_offsets = [margin_px]
                    for i in range(cols):
                        if i > 0:
                            x_offsets.append(x_offsets[i-1] + col_widths[i-1] * scale + margin_px)
                    
                    y_offsets = [margin_px]
                    for i in range(rows):
                        if i > 0:
                            y_offsets.append(y_offsets[i-1] + row_heights[i-1] * scale + margin_px)
            
            # Calculate final positions
            for idx in range(total_count):
                col = idx % cols
                row = idx // cols
                x = x_offsets[col]
                y = y_offsets[row]
                positions.append((x, y, scale))
            
            best_layout = (cols, rows, positions)
    
    return best_layout

def create_circular_struct(radius_px):
    if radius_px < 1:
        radius_px = 1
    diameter = 2 * radius_px + 1
    y, x = np.ogrid[:diameter, :diameter]
    center = radius_px
    dist_sq = (x - center)**2 + (y - center)**2
    return dist_sq <= (radius_px**2)

def smooth_outline(nodes, iterations=2):
    """
    Smooth the outline by replacing each node with the average of its neighbors.
    This helps remove spikes or lumps.
    """
    if len(nodes) < 3:
        return nodes

    for _ in range(iterations):
        new_nodes = []
        for i in range(len(nodes)):
            p_prev = nodes[(i - 1) % len(nodes)]
            p_cur = nodes[i]
            p_next = nodes[(i + 1) % len(nodes)]
            x = (p_prev[0] + p_cur[0] + p_next[0]) / 3.0
            y = (p_prev[1] + p_cur[1] + p_next[1]) / 3.0
            new_nodes.append((x, y))
        nodes = new_nodes

    # Re-close the loop if needed
    if nodes[0] != nodes[-1]:
        nodes.append(nodes[0])
    return nodes

###############################################################################
# OUTLINE / MASK UTILITIES
###############################################################################

def create_shape_mask(img):
    """Return a binary mask: True for non-white, non-transparent pixels."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    arr = np.array(img)
    alpha_mask = (arr[:, :, 3] > 0)
    rgb = arr[:, :, :3]
    white_mask = np.all(rgb == 255, axis=2) & alpha_mask
    shape_mask = alpha_mask & ~white_mask
    return shape_mask

def dilate_mask(shape_mask, offset_in):
    """Morphologically dilate the mask by offset_in (inches)."""
    offset_px = int(round(offset_in * DPI))
    if offset_px < 1:
        return shape_mask.copy()
    struct = create_circular_struct(offset_px)
    return ndimage.binary_dilation(shape_mask, structure=struct)

def extract_boundary_points(binary_mask):
    """Extract boundary pixels by XOR with an eroded version."""
    struct = np.ones((3,3), dtype=bool)
    eroded = ndimage.binary_erosion(binary_mask, structure=struct)
    boundary = binary_mask ^ eroded
    by, bx = np.nonzero(boundary)
    return list(zip(bx, by))  # (x, y)

def extract_contour_points(binary_mask):
    """
    Extract contour points in proper sequential order around the perimeter.
    Uses a basic contour tracing algorithm to maintain correct perimeter order.
    """
    # First get the boundary
    struct = np.ones((3,3), dtype=bool)
    eroded = ndimage.binary_erosion(binary_mask, structure=struct)
    boundary = binary_mask ^ eroded
    
    if not np.any(boundary):
        return []
    
    # Find a starting point on the boundary
    ys, xs = np.nonzero(boundary)
    if len(ys) == 0:
        return []
    
    start_idx = 0
    start_x, start_y = xs[start_idx], ys[start_idx]
    
    # 8-connected neighborhood directions (clockwise from right)
    # (dx, dy) pairs for the 8 neighbors
    directions = [(1,0), (1,1), (0,1), (-1,1), (-1,0), (-1,-1), (0,-1), (1,-1)]
    
    contour = [(start_x, start_y)]
    cur_x, cur_y = start_x, start_y
    boundary_copy = boundary.copy()
    boundary_copy[cur_y, cur_x] = False  # Mark as visited
    
    # Start with right direction
    dir_idx = 0
    
    max_points = np.sum(boundary)  # Max possible points
    
    # Trace the contour
    for _ in range(int(max_points * 2)):  # Safety to prevent infinite loops
        # Try all 8 directions starting from the current one
        found = False
        for i in range(8):
            # Try the next direction (clockwise)
            check_idx = (dir_idx + i) % 8
            dx, dy = directions[check_idx]
            next_x, next_y = cur_x + dx, cur_y + dy
            
            # Check if it's a valid boundary pixel
            if (0 <= next_y < boundary.shape[0] and 
                0 <= next_x < boundary.shape[1] and 
                boundary_copy[next_y, next_x]):
                
                # Add to contour and mark as visited
                contour.append((next_x, next_y))
                boundary_copy[next_y, next_x] = False
                
                # Update current position
                cur_x, cur_y = next_x, next_y
                
                # Start looking in a CCW direction from where we came
                dir_idx = (check_idx + 5) % 8
                
                found = True
                break
        
        if not found or (cur_x == start_x and cur_y == start_y and len(contour) > 2):
            break
    
    # Close the loop if needed
    if len(contour) > 2 and contour[0] != contour[-1]:
        contour.append(contour[0])
        
    return contour

def sort_points_by_angle(points):
    """
    Sort boundary points by angle around their centroid.
    NOTE: This may cause jumps for concave shapes.
    """
    if not points:
        return []
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    cx = np.mean(xs)
    cy = np.mean(ys)
    angled = []
    for (x, y) in points:
        angle = math.atan2(y - cy, x - cx)
        angled.append((angle, (x, y)))
    angled.sort(key=lambda x: x[0])
    sorted_points = [p[1] for p in angled]
    # close loop if needed
    if len(sorted_points) > 1 and sorted_points[0] != sorted_points[-1]:
        sorted_points.append(sorted_points[0])
    return sorted_points

def distance(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])

def sample_by_fixed_step(points, step_px=15.0):
    """
    Given boundary points forming a loop (first == last),
    walk the perimeter in increments of 'step_px' until we come full circle.
    Returns a new list of points, each ~step_px apart.
    
    NOTE: This requires that 'points' are in sequential perimeter order
    (or close to it). If they're only sorted by angle, it can produce
    strange results on concave shapes. For best results, use a true contour trace.
    """
    if not points:
        return []
    if points[0] != points[-1]:
        points = points + [points[0]]
    
    # Build cumulative distance array
    dists = [0.0]
    for i in range(1, len(points)):
        dists.append(dists[-1] + distance(points[i-1], points[i]))
    total_perim = dists[-1]
    if total_perim < 1e-9:
        return points
    
    result = []
    idx = 0
    dist_covered = 0.0
    
    while dist_covered < total_perim:
        # Move idx until dists[idx] >= dist_covered
        while idx < len(dists) and dists[idx] < dist_covered:
            idx += 1
        if idx >= len(dists):
            idx = len(dists) - 1
        
        # If we land exactly on a boundary point
        if math.isclose(dists[idx], dist_covered, rel_tol=1e-7):
            result.append(points[idx])
        else:
            # Interpolate between idx-1 and idx
            i1 = max(0, idx - 1)
            i2 = idx
            d1 = dists[i1]
            d2 = dists[i2]
            if math.isclose(d1, d2):
                result.append(points[i1])
            else:
                ratio = (dist_covered - d1) / (d2 - d1)
                x1, y1 = points[i1]
                x2, y2 = points[i2]
                x = x1 + ratio * (x2 - x1)
                y = y1 + ratio * (y2 - y1)
                result.append((x, y))
        
        dist_covered += step_px
    
    # Close the loop
    if result and result[0] != result[-1]:
        result.append(result[0])
    return result

###############################################################################
# CRUDE OUTLINE WITH FIXED STEP
###############################################################################

def pass1_crude_outline(img, offset_in=0.1, step_px=15):
    """
    1) Create shape mask
    2) Morphologically dilate by offset_in
    3) Extract boundary points using contour tracing (not angle-sorting)
    4) Sample by fixed step length in pixels
    """
    shape_mask = create_shape_mask(img)
    dilated_mask = dilate_mask(shape_mask, offset_in)
    
    # Use proper contour tracing instead of angle-sorting
    boundary_pts = extract_contour_points(dilated_mask)
    
    # Sample every ~15 pixels (tweak as needed)
    nodes = sample_by_fixed_step(boundary_pts, step_px=step_px)
    return nodes, shape_mask

###############################################################################
# SIMPLE REFINEMENT (MIDPOINT CHECK)
###############################################################################

def midpoint(a, b):
    return ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)

def is_inside_mask(x, y, mask):
    xi = int(round(x))
    yi = int(round(y))
    if 0 <= yi < mask.shape[0] and 0 <= xi < mask.shape[1]:
        return mask[yi, xi]
    return False

def line_intersects_shape(p1, p2, shape_mask, steps=10):
    """
    Check if a line segment between p1 and p2 intersects with the shape.
    Samples multiple points along the segment for more robust detection.
    """
    for i in range(steps + 1):
        t = i / steps
        x = p1[0] + t*(p2[0] - p1[0])
        y = p1[1] + t*(p2[1] - p1[1])
        if is_inside_mask(x, y, shape_mask):
            return True
    return False

def compute_local_normal(p, shape_mask, sample_radius=5):
    """
    Compute local outward normal direction at point p.
    The normal is computed based on the gradient of the distance transform.
    """
    x, y = int(round(p[0])), int(round(p[1]))
    
    # Create a small region around the point
    y_min = max(0, y - sample_radius)
    y_max = min(shape_mask.shape[0], y + sample_radius + 1)
    x_min = max(0, x - sample_radius)
    x_max = min(shape_mask.shape[1], x + sample_radius + 1)
    
    # If point is outside the mask, return vector toward nearest mask point
    if not is_inside_mask(x, y, shape_mask):
        return 0, 0
    
    # Sample a local region
    region = shape_mask[y_min:y_max, x_min:x_max]
    
    # Distance transform of the inverse (distance from background)
    dist_transform = ndimage.distance_transform_edt(region)
    
    # Compute gradient (will point inward, so we'll negate it)
    gy, gx = np.gradient(dist_transform)
    
    # Sample at our point
    loc_y = y - y_min
    loc_x = x - x_min
    
    if loc_y >= 0 and loc_y < gy.shape[0] and loc_x >= 0 and loc_x < gy.shape[1]:
        # Normalize the gradient (points outward)
        dx, dy = -gx[loc_y, loc_x], -gy[loc_y, loc_x]
        mag = math.sqrt(dx*dx + dy*dy)
        if mag > 1e-6:
            return dx/mag, dy/mag
    
    # Fallback - use global center method
    xs = np.nonzero(shape_mask)[1]
    ys = np.nonzero(shape_mask)[0]
    if len(xs) > 0 and len(ys) > 0:
        cx, cy = np.mean(xs), np.mean(ys)
        dx, dy = x - cx, y - cy
        mag = math.sqrt(dx*dx + dy*dy)
        if mag > 1e-6:
            return dx/mag, dy/mag
    
    return 0, 1  # Default to upward direction

def push_outward_from_center(px, py, cx, cy, shape_mask, step=1.0, extra_offset=5):
    dx = px - cx
    dy = py - cy
    dist = math.hypot(dx, dy)
    if dist < 1e-6:
        dx, dy = 1.0, 0.0
        dist = 1.0
    dx /= dist
    dy /= dist
    
    x, y = px, py
    while is_inside_mask(x, y, shape_mask):
        x += dx * step
        y += dy * step
    x += dx * extra_offset
    y += dy * extra_offset
    return (x, y)

def push_outward_locally(px, py, shape_mask, step=1.0, extra_offset=5):
    """
    Push a point outward using local normal direction instead of global center.
    More accurate for complex/concave shapes.
    """
    dx, dy = compute_local_normal((px, py), shape_mask)
    if dx == 0 and dy == 0:
        # Fallback to using a simple direction
        xs = np.nonzero(shape_mask)[1]
        ys = np.nonzero(shape_mask)[0]
        if len(xs) > 0 and len(ys) > 0:
            cx, cy = np.mean(xs), np.mean(ys)
            dx = px - cx
            dy = py - cy
            dist = math.hypot(dx, dy)
            if dist > 1e-6:
                dx /= dist
                dy /= dist
            else:
                dx, dy = 1.0, 0.0
        else:
            dx, dy = 1.0, 0.0
    
    x, y = px, py
    while is_inside_mask(x, y, shape_mask):
        x += dx * step
        y += dy * step
    x += dx * extra_offset
    y += dy * extra_offset
    return (x, y)

def refine_outline(nodes, shape_mask, max_iterations=5):
    """
    Improved refinement: check multiple points along each segment and use local normals.
    """
    if len(nodes) < 2:
        return nodes
    
    # Ensure closed loop
    if nodes[0] != nodes[-1]:
        nodes.append(nodes[0])
    
    for _ in range(max_iterations):
        changed = False
        new_nodes = []
        
        for i in range(len(nodes) - 1):
            p1 = nodes[i]
            p2 = nodes[i+1]
            new_nodes.append(p1)
            
            # Check if any point along the line intersects the shape
            if line_intersects_shape(p1, p2, shape_mask, steps=10):
                m = midpoint(p1, p2)
                # Use local normal direction for more accurate push
                out_pt = push_outward_locally(m[0], m[1], shape_mask, step=1.0, extra_offset=5)
                new_nodes.append(out_pt)
                changed = True
        
        # Ensure closed loop
        if new_nodes and new_nodes[0] != new_nodes[-1]:
            new_nodes.append(new_nodes[0])
        
        if changed:
            nodes = new_nodes
        else:
            break
    
    return nodes

###############################################################################
# NEW FUNCTION: PROCESS SINGLE IMAGE
###############################################################################

def process_image_with_cutline(img_path, line_width=3, line_color='black', offset_in=0.1):
    """
    Process a single image - add cutline and crop to remove excess transparency.
    
    Args:
        img_path: Path to the image file
        line_width: Width of the cutline
        line_color: Color of the cutline
        offset_in: Offset in inches for morphological dilation
    
    Returns:
        PIL Image with cutline added and cropped
    """
    try:
        # Open the image
        img = Image.open(img_path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Get original dimensions
        w, h = img.size
        
        # Create a new transparent image for the cutline
        cutline_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(cutline_img)
        
        # Draw the cutline
        nodes_pass1, original_mask = pass1_crude_outline(img, offset_in=offset_in, step_px=15)
        nodes_pass2 = refine_outline(nodes_pass1, original_mask, max_iterations=5)
        nodes_smoothed = smooth_outline(nodes_pass2, iterations=2)
        
        if len(nodes_smoothed) > 1:
            draw.line(nodes_smoothed, fill=line_color, width=line_width)
        
        # Composite the original image with the cutline
        result_img = Image.alpha_composite(img, cutline_img)
        
        # Find the bounding box of non-transparent pixels
        # Include the cutline in this calculation
        alpha = np.array(result_img)[:, :, 3]
        non_empty_columns = np.where(alpha.max(axis=0) > 0)[0]
        non_empty_rows = np.where(alpha.max(axis=1) > 0)[0]
        
        if len(non_empty_columns) > 0 and len(non_empty_rows) > 0:
            min_x = non_empty_columns[0]
            max_x = non_empty_columns[-1] + 1
            min_y = non_empty_rows[0]
            max_y = non_empty_rows[-1] + 1
            
            # Add a small buffer (3 pixels) around the content
            buffer = 3
            min_x = max(0, min_x - buffer)
            min_y = max(0, min_y - buffer)
            max_x = min(w, max_x + buffer)
            max_y = min(h, max_y + buffer)
            
            # Crop the image to this bounding box
            result_img = result_img.crop((min_x, min_y, max_x, max_y))
        
        return result_img
    
    except Exception as e:
        print(f"Error processing {img_path}: {e}")
        return None

###############################################################################
# MAIN SCRIPT
###############################################################################

def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <copies_per_image> [offset_in]")
        sys.exit(1)
    
    try:
        copies_per_image = int(sys.argv[1])
    except ValueError:
        print("Please provide a valid integer for copies per image.")
        sys.exit(1)
    
    # Parse optional offset_in parameter
    offset_in = 0.1  # Default value
    if len(sys.argv) > 2:
        try:
            offset_in = float(sys.argv[2])
            print(f"Using custom offset: {offset_in} inches")
        except ValueError:
            print(f"Invalid offset value. Using default: {offset_in} inches")
    
    # Ensure output directories exist
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
    output_finished = os.path.join(OUTPUT_FOLDER, 'Finished')
    if not os.path.exists(output_finished):
        os.makedirs(output_finished)
        
    # Move existing output files to Finished folder
    print("Checking for existing output files...")
    output_files = glob.glob(os.path.join(OUTPUT_FOLDER, "*.jpg"))
    moved_count = 0
    
    for output_file in output_files:
        if os.path.dirname(output_file) == OUTPUT_FOLDER:  # Only process files directly in Output folder
            filename = os.path.basename(output_file)
            
            # Check if destination file already exists, add number if needed
            dest_path = os.path.join(output_finished, filename)
            base_name, extension = os.path.splitext(filename)
            counter = 1
            
            while os.path.exists(dest_path):
                dest_path = os.path.join(output_finished, f"{base_name}_{counter}{extension}")
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
    
    image_files = load_input_images()
    if not image_files:
        print("No input images found in", INPUT_FOLDER)
        sys.exit(1)
    
    print(f"Processing {len(image_files)} unique images...")
    
    # Step 1: Process each UNIQUE image once
    processed_images = []
    processed_images_sizes = []
    line_color = 'black'  # Set consistent color for cutlines
    line_width = 3
    
    # Process each unique image once
    for img_path in image_files:
        # Process the image once with cutlines
        result_img = process_image_with_cutline(img_path, line_width=line_width, line_color=line_color, offset_in=offset_in)
        if result_img:
            # Add this processed image to our list multiple times based on copies_per_image
            for _ in range(copies_per_image):
                processed_images.append(result_img)
                processed_images_sizes.append((result_img.width, result_img.height))
    
    if not processed_images:
        print("No images were successfully processed.")
        sys.exit(1)
    
    print(f"Placing {len(processed_images)} total images on the page...")
    
    # Step 3: Create a new page for output
    page = Image.new('RGB', (PAGE_WIDTH_PX, PAGE_HEIGHT_PX), 'white')
    
    # Step 4: Calculate the optimal layout
    margin_px = int(MARGIN_IN * DPI)
    layout = choose_grid(processed_images_sizes, margin_px)
    
    if not layout:
        print("Cannot fit images on the page with given constraints.")
        sys.exit(1)
    
    cols, rows, positions = layout
    print(f"Arranging images in a {cols}x{rows} grid...")
    
    # Step 5: Place each image on the page according to calculated positions
    for idx, (img, (x, y, scale)) in enumerate(zip(processed_images, positions)):
        if idx >= len(processed_images):
            break
        
        # Scale the image if needed
        if scale < 1.0:
            new_width = int(img.width * scale)
            new_height = int(img.height * scale)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Paste the image with its alpha channel as mask
        page.paste(img, (int(x), int(y)), img)
    
    # Get the first 10 characters of the first input image filename (without extension)
    first_image_base = os.path.splitext(os.path.basename(image_files[0]))[0]
    first_image_prefix = first_image_base[:10]
    
    # Get current date in MMDDYYYY format
    from datetime import datetime
    date_str = datetime.now().strftime("%m%d%Y")
    
    # Determine count (check if files with same input prefix exist)
    count = 1
    existing_files = glob.glob(os.path.join(OUTPUT_FOLDER, f"*_{date_str}_{first_image_prefix}*.jpg"))
    if existing_files:
        count = len(existing_files) + 1
    
    # Create the output filename
    out_file = os.path.join(OUTPUT_FOLDER, f"{count}_{date_str}_{first_image_prefix}.jpg")
    page.save(out_file, "JPEG", dpi=(DPI, DPI))
    print("Output page saved to", out_file)
    
    # Move processed images to FINISHED_FOLDER
    if not os.path.exists(FINISHED_FOLDER):
        os.makedirs(FINISHED_FOLDER)
    
    # Check if we're running as a standalone script or as part of the pipeline
    # If INPUT_FOLDER has been altered to be Input/bgRemoved, we're in the pipeline
    if 'bgRemoved' in INPUT_FOLDER:
        # In pipeline mode, don't move files (let main.py handle it)
        print("Running in pipeline mode. File archiving will be handled by the pipeline.")
    else:
        # Standalone mode - move files to Finished
        for f in image_files:
            try:
                shutil.move(f, os.path.join(FINISHED_FOLDER, os.path.basename(f)))
                print(f"Moved {f} to {FINISHED_FOLDER}")
            except Exception as e:
                print(f"Error moving file {f}: {e}")
    
    return True

if __name__ == "__main__":
    main()
