import cv2
import numpy as np
from ultralytics import YOLO
from util import read_license_plate, write_csv
import os
import signal
import sys
import time
import torch  # for GPU detection

#rstp video setting
os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;tcp'


should_exit = False

def signal_handler(sig, frame):
    global should_exit
    should_exit = True
    print("\nReceived shutdown signal. Finishing current frame...")

signal.signal(signal.SIGINT, signal_handler)


#GPU
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")
if device == 'cuda':
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

# Load YOLO models and move them to the selected device
coco_model = YOLO(r'C:\Users\deoat\Desktop\Safety-Checking-UsingYolo\backend\models\yolov8n.pt')
license_plate_detector = YOLO(r'C:\Users\deoat\Desktop\Safety-Checking-UsingYolo\backend\models\licence_plate.pt')

if device == 'cuda':
    coco_model.to(device)
    license_plate_detector.to(device)
    print("Models moved to GPU successfully!")

# OCR GPU flag (pass to read_license_plate if it supports it)
gpu_available = torch.cuda.is_available()
print(f"GPU available for OCR: {gpu_available}")


# plate_seen[track_id] = set of normalized plate texts already recorded for that track
plate_seen = {}
MIN_OCR_CONF = 0.2        # minimum OCR confidence to consider a detection
MIN_LP_CONF = 0.2     # minimum license‑plate detection confidence


# For testing with VLC RTSP server:
# rtsp_url = "rtsp://127.0.0.1:8554/test"
# To use a local video file instead, uncomment the line below and comment the rtsp_url line:
video_path = r"C:\Users\deoat\Downloads\2103099-uhd_3840_2160_30fps.mp4"
# video_path = rtsp_url

output_csv = './test.csv'
skip_frames = 2          # process every 2nd frame (adjust as needed)
write_interval = 50      # write results to CSV every N processed frames

# COCO vehicle classes: car(2), motorbike(3), bus(5), truck(7)
vehicles = [2, 3, 5, 7]

cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
if not cap.isOpened():
    raise ValueError(f"Error: Could not open video stream {video_path}")

results = {}          # frame_nmr -> {track_id: {car..., license_plate...}}
frame_nmr = -1
processed_count = 0

print("Starting license plate detection. Press Ctrl+C to stop early.")
print(f"Using video source: {video_path}")

try:
    while cap.isOpened() and not should_exit:
        ret, frame = cap.read()
        if not ret:
            print("Warning: Frame grab failed – attempting to reconnect...")
            cap.release()

            # Simple reconnection loop (max 5 attempts)
            for _ in range(5):
                cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
                if cap.isOpened():
                    print("Reconnected successfully.")
                    break
                print("Reconnection attempt failed, retrying...")
                time.sleep(1)
            else:
                print("Failed to reconnect after several attempts. Exiting.")
                break
            continue

        frame_nmr += 1

        # ---- Frame skipping ----
        if frame_nmr % skip_frames != 0:
            continue

        processed_count += 1
        print(f"Processing frame {frame_nmr} (processed: {processed_count})", end='\r')

        # ---- Vehicle detection & tracking (YOLO on GPU) ----
        vehicle_results = coco_model.track(
            frame,
            persist=True,
            classes=vehicles,
            verbose=False,
            device=device,
            imgsz=640
        )[0]

        results[frame_nmr] = {}

        # ---- Extract vehicle detections with track IDs ----
        vehicle_detections = []
        if vehicle_results.boxes.id is not None:
            for box in vehicle_results.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls = int(box.cls[0].cpu().numpy())
                track_id = int(box.id[0].cpu().numpy())

                if cls in vehicles:
                    vehicle_detections.append([x1, y1, x2, y2, conf, track_id])

        # ---- Process each detected vehicle ----
        for vehicle in vehicle_detections:
            xcar1, ycar1, xcar2, ycar2, score, track_id = vehicle

            # Crop vehicle region
            vehicle_crop = frame[int(ycar1):int(ycar2), int(xcar1):int(xcar2), :]
            if vehicle_crop.size == 0:
                continue

            # License‑plate detection (YOLO on GPU)
            lp_results = license_plate_detector(
                vehicle_crop,
                verbose=False,
                device=device,
                imgsz=320
            )[0]

            # Process each license‑plate detection
            for lp in lp_results.boxes.data.tolist():
                x1, y1, x2, y2, lp_score, cls_id = lp

                if lp_score < MIN_LP_CONF:
                    continue  # ignore low‑confidence plate detections

                # Adjust coordinates to original frame
                abs_x1 = int(x1) + int(xcar1)
                abs_y1 = int(y1) + int(ycar1)
                abs_x2 = int(x2) + int(xcar1)
                abs_y2 = int(y2) + int(ycar1)

                # Crop license plate
                license_plate_crop = frame[abs_y1:abs_y2, abs_x1:abs_x2, :]
                if license_plate_crop.size == 0:
                    continue

                # OCR
                license_plate_text, license_plate_text_score = read_license_plate(license_plate_crop)

                if license_plate_text is None or license_plate_text_score < MIN_OCR_CONF:
                    continue  # ignore OCR failures/low confidence

                # Normalize plate text for deduplication (uppercase, no spaces)
                norm_text = license_plate_text.upper().replace(" ", "")

                # Initialize set for this track if needed
                if track_id not in plate_seen:
                    plate_seen[track_id] = set()

                # If we have already seen this exact normalized text for this track, skip
                if norm_text in plate_seen[track_id]:
                    # Optional: uncomment for debug
                    # print(f"Duplicate plate '{license_plate_text}' for track {track_id} skipped")
                    continue

                # ---- NEW UNIQUE PLATE ----
                plate_seen[track_id].add(norm_text)

                # Store results for this frame/track
                results[frame_nmr][track_id] = {
                    'car': {'bbox': [xcar1, ycar1, xcar2, ycar2]},
                    'license_plate': {
                        'bbox': [abs_x1, abs_y1, abs_x2, abs_y2],
                        'text': license_plate_text,
                        'bbox_score': lp_score,
                        'text_score': license_plate_text_score
                    }
                }

        # ---- Periodic CSV write ----
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
    print(f"\nProcessing complete. Results saved to {output_csv}")
    print(f"Total frames processed: {processed_count}")
