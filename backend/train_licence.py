import cv2
import numpy as np
from ultralytics import YOLO
from util import  read_license_plate, write_csv
import signal

# Flag for graceful shutdown
should_exit = False

def signal_handler(sig, frame):
    global should_exit
    should_exit = True
    print("\nReceived shutdown signal. Finishing current frame...")

# Register signal handler for Ctrl+C
signal.signal(signal.SIGINT, signal_handler)

# Initialize models
coco_model = YOLO(r'C:\Users\deoat\Desktop\Safety-Checking-UsingYolo\backend\models\yolov8n.pt')
license_plate_detector = YOLO(r'C:\Users\deoat\Desktop\Safety-Checking-UsingYolo\backend\models\licence_plate.pt')

# Initialize OCR reader with GPU if available
try:
    import torch
    gpu_available = torch.cuda.is_available()
except ImportError:
    gpu_available = False

reader = None  # Will be initialized in read_license_plate function when needed

# Video settings
video_path = r"C:\Users\deoat\Downloads\2103099-uhd_3840_2160_30fps.mp4"
output_csv = './test.csv'
output_video = './output_annotated.mp4'  # Output video file
skip_frames = 2  # Process every 2nd frame (adjust as needed)
write_interval = 50  # Write results to CSV every 50 processed frames

# Vehicle classes from COCO dataset (car, motorbike, bus, truck)
vehicles = [2, 3, 5, 7]

# Open video
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    raise ValueError(f"Error: Could not open video file {video_path}")

# Get video properties for output
frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

# Define codec and create VideoWriter object
fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # or use 'XVID'
out = cv2.VideoWriter(output_video, fourcc, fps, (frame_width, frame_height))

# Results storage and frame counter
results = {}
frame_nmr = -1
processed_count = 0

print("Starting license plate detection. Press Ctrl+C to stop early.")
print(f"Output video will be saved to: {output_video}")

try:
    while cap.isOpened() and not should_exit:
        ret, frame = cap.read()
        if not ret:
            print("End of video or cannot read frame")
            break
            
        frame_nmr += 1
        
        # Skip frames based on skip_frames setting
        if frame_nmr % skip_frames != 0:
            # Still write the original frame to output video for skipped frames
            out.write(frame)
            continue
            
        processed_count += 1
        print(f"Processing frame {frame_nmr} (processed: {processed_count})", end='\r')
        
        # Vehicle detection and tracking using YOLO's built-in tracker
        vehicle_results = coco_model.track(frame, persist=True, classes=vehicles, verbose=False)[0]
        
        # Initialize frame results
        results[frame_nmr] = {}
        
        # Extract vehicle detections with track IDs
        vehicle_detections = []
        if vehicle_results.boxes.id is not None:
            for box in vehicle_results.boxes:
                # Get box data: x1, y1, x2, y2, confidence, class, track_id
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls = int(box.cls[0].cpu().numpy())
                track_id = int(box.id[0].cpu().numpy())
                
                if cls in vehicles:
                    vehicle_detections.append([x1, y1, x2, y2, conf, track_id])
        
        # Process each detected vehicle
        for vehicle in vehicle_detections:
            xcar1, ycar1, xcar2, ycar2, score, track_id = vehicle
            
            # Crop vehicle region for license plate detection
            vehicle_crop = frame[int(ycar1):int(ycar2), int(xcar1):int(xcar2), :]
            
            # Skip if crop is invalid
            if vehicle_crop.size == 0:
                continue
                
            # Detect license plates in vehicle region
            lp_results = license_plate_detector(vehicle_crop, verbose=False)[0]
            
            # Process each license plate detection
            for lp in lp_results.boxes.data.tolist():
                x1, y1, x2, y2, lp_score, cls_id = lp
                
                # Adjust coordinates to original frame
                abs_x1 = int(x1) + int(xcar1)
                abs_y1 = int(y1) + int(xcar1)
                abs_x2 = int(x2) + int(xcar1)
                abs_y2 = int(y2) + int(xcar1)
                
                # Crop license plate
                license_plate_crop = frame[abs_y1:abs_y2, abs_x1:abs_x2, :]
                
                # Skip if crop is invalid
                if license_plate_crop.size == 0:
                    continue
                    
                # Process license plate (OCR)
                license_plate_text, license_plate_text_score = read_license_plate(license_plate_crop)
                
                if license_plate_text is not None:
                    # Store results
                    results[frame_nmr][track_id] = {
                        'car': {'bbox': [xcar1, ycar1, xcar2, ycar2]},
                        'license_plate': {
                            'bbox': [abs_x1, abs_y1, abs_x2, abs_y2],
                            'text': license_plate_text,
                            'bbox_score': lp_score,
                            'text_score': license_plate_text_score
                        }
                    }
        
        # Create annotated frame for output video
        annotated_frame = frame.copy()
        
        # Draw vehicle bounding boxes and track IDs
        for vehicle in vehicle_detections:
            xcar1, ycar1, xcar2, ycar2, score, track_id = vehicle
            # Draw bounding box
            cv2.rectangle(annotated_frame, (int(xcar1), int(ycar1)), (int(xcar2), int(ycar2)), (0, 255, 0), 2)
            # Draw track ID
            cv2.putText(annotated_frame, f'ID: {track_id}', (int(xcar1), int(ycar1)-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Draw license plate detections
        for track_id, data in results.get(frame_nmr, {}).items():
            if 'license_plate' in data:
                lp_bbox = data['license_plate']['bbox']
                lp_text = data['license_plate']['text']
                lp_score = data['license_plate']['bbox_score']
                text_score = data['license_plate']['text_score']
                
                # Draw license plate bounding box
                cv2.rectangle(annotated_frame, 
                             (int(lp_bbox[0]), int(lp_bbox[1])), 
                             (int(lp_bbox[2]), int(lp_bbox[3])), 
                             (0, 0, 255), 2)
                
                # Draw license plate text and confidence
                label = f'LP: {lp_text} ({lp_score:.2f})'
                cv2.putText(annotated_frame, label, 
                           (int(lp_bbox[0]), int(lp_bbox[1])-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        # Write the annotated frame to output video
        out.write(annotated_frame)
        
        # Write results periodically to prevent memory buildup
        if processed_count % write_interval == 0:
            write_csv(results, output_csv)
            print(f"\nIntermediate results written to {output_csv}")
            
except Exception as e:
    print(f"\nError during processing: {str(e)}")
    raise
finally:
    # Final write and cleanup
    write_csv(results, output_csv)
    cap.release()
    out.release()  # Release the video writer
    # Note: No cv2.destroyAllWindows() needed since we removed GUI code
    print(f"\nProcessing complete. Results saved to {output_csv}")
    print(f"Output video saved to: {output_video}")
    print(f"Total frames processed: {processed_count}")
