from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import os
from ultralytics import YOLO
import numpy as np
import threading
import io  # For potential future video uploads

app = Flask(__name__)
# Enable CORS; restrict to your Vercel frontend for prod
CORS(app, origins=["https://safety-ai-steel.vercel.app", "http://localhost:3000"])  # Adjust as needed

# Load YOLO model - updated path for deployment (assumes models/best.pt in repo root)
model_path = os.path.join(os.path.dirname(__file__), "models", "best.pt")
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model not found at {model_path}. Ensure models/best.pt is in your repo.")
model = YOLO(model_path)

camera = None
camera_active = False
stats_lock = threading.Lock()

stats = {
    "total_persons": 0,
    "persons_without_safety_gear": 0,
    "persons_with_safety_gear": 0,
    "percentage_without_gear": 0.0,
    "percentage_with_gear": 0.0
}

def generate_frames():
    global camera, camera_active, stats
    
    while camera_active and camera is not None and camera.isOpened():
        success, frame = camera.read()
        if not success:
            break
        
        frame = cv2.flip(frame, 1)

        # Reset counters for each frame
        total_persons = 0
        persons_without_safety_gear = 0
        persons_with_safety_gear = 0

        # Perform YOLO inference
        results = model(frame, verbose=False)  # Suppress verbose output for prod

        # Process detections
        for result in results:
            if result.boxes is not None and len(result.boxes) > 0:
                boxes = result.boxes.xyxy.cpu().numpy()  # Bounding boxes
                confidences = result.boxes.conf.cpu().numpy()  # Confidence scores
                class_ids = result.boxes.cls.cpu().numpy()  # Class IDs
                class_names = result.names  # Class names dictionary

                for i in range(len(boxes)):
                    x1, y1, x2, y2 = map(int, boxes[i])
                    confidence = confidences[i]
                    class_id = int(class_ids[i])
                    class_name = class_names[class_id]
                    
                    # Count persons and safety violations (updated logic for better accuracy)
                    if class_name.lower() == "person":
                        total_persons += 1
                    elif class_name.startswith("no-") or "without" in class_name.lower():
                        persons_without_safety_gear += 1
                    elif class_name.lower() in ["hardhat", "mask", "safety vest", "safety_vest", "vest"]:
                        persons_with_safety_gear += 1
                        
                    # Draw bounding box and label
                    color = (0, 255, 0) if not (class_name.startswith("no-") or "without" in class_name.lower()) else (0, 0, 255)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{class_name} {confidence:.2f}"
                    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Update global stats with thread safety
        with stats_lock:
            stats["total_persons"] = total_persons
            stats["persons_without_safety_gear"] = persons_without_safety_gear
            stats["persons_with_safety_gear"] = persons_with_safety_gear
            stats["percentage_without_gear"] = (
                (persons_without_safety_gear / max(total_persons, 1) * 100)
            )
            stats["percentage_with_gear"] = (
                (persons_with_safety_gear / max(total_persons, 1) * 100)
            )
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            frame_bytes = buffer.tobytes()

            # Yield frame in byte format for streaming
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    if camera_active and camera is not None:
        return Response(generate_frames(), 
                       mimetype='multipart/x-mixed-replace; boundary=frame')
    else:
        # Return a black frame if camera is not active (for prod, consider a placeholder image)
        blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        ret, buffer = cv2.imencode('.jpg', blank_frame)
        frame_bytes = buffer.tobytes()
        
        def generate_blank():
            while True:  # Infinite loop for streaming
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        return Response(generate_blank(), 
                       mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_camera', methods=['POST'])
def start_camera():
    global camera, camera_active
    
    # Note: In prod on Render, this may not access hardware; use for simulated/demo feeds
    try:
        if not camera_active:
            # For prod, you might want to use a video file or remote stream instead of index 0
            camera = cv2.VideoCapture(0)  # Or cv2.VideoCapture('path/to/demo_video.mp4') for testing
            if camera.isOpened():
                camera_active = True
                # Reset stats when starting camera
                with stats_lock:
                    stats["total_persons"] = 0
                    stats["persons_without_safety_gear"] = 0
                    stats["persons_with_safety_gear"] = 0
                    stats["percentage_without_gear"] = 0.0
                    stats["percentage_with_gear"] = 0.0
                return jsonify({"status": "Camera started"}), 200
            else:
                return jsonify({"status": "Failed to start camera (check hardware/stream source)"}), 500
        else:
            return jsonify({"status": "Camera already running"}), 200
    except Exception as e:
        return jsonify({"status": f"Error starting camera: {str(e)}"}), 500

@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    global camera, camera_active
    
    try:
        if camera_active:
            camera_active = False
            if camera is not None:
                camera.release()
                camera = None
            # Reset stats when stopping camera
            with stats_lock:
                stats["total_persons"] = 0
                stats["persons_without_safety_gear"] = 0
                stats["persons_with_safety_gear"] = 0
                stats["percentage_without_gear"] = 0.0
                stats["percentage_with_gear"] = 0.0
            return jsonify({"status": "Camera stopped"}), 200
        else:
            return jsonify({"status": "Camera not running"}), 200
    except Exception as e:
        return jsonify({"status": f"Error stopping camera: {str(e)}"}), 500

@app.route('/get_stats')
def get_stats():
    with stats_lock:
        return jsonify(stats.copy())

@app.route('/health')
def health_check():
    return jsonify({"status": "Backend running", "camera_active": camera_active})

# Optional: Add endpoint for video upload (for prod, since no local camera)
@app.route('/analyze_video', methods=['POST'])
def analyze_video():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Read uploaded video into memory
    file_bytes = io.BytesIO(file.read())
    cap = cv2.VideoCapture()
    cap.open(file_bytes)
    
    total_persons = 0
    violations = 0
    frames_analyzed = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frames_analyzed += 1
        
        results = model(frame, verbose=False)
        for result in results:
            if result.boxes is not None:
                class_ids = result.boxes.cls.cpu().numpy()
                class_names = [model.names[int(c)] for c in class_ids]
                total_persons += sum(1 for name in class_names if name.lower() == "person")
                violations += sum(1 for name in class_names if "no-" in name.lower() or "without" in name.lower())
    
    cap.release()
    
    violation_rate = (violations / max(total_persons, 1)) * 100
    return jsonify({
        "frames_analyzed": frames_analyzed,
        "total_persons": total_persons,
        "violations": violations,
        "violation_rate": violation_rate
    })

if __name__ == '__main__':
    # For local dev only; Render uses gunicorn
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True, threaded=True)
else:
    # Cleanup on shutdown
    if camera is not None:
        camera.release()
        cv2.destroyAllWindows()