from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
from ultralytics import YOLO
import numpy as np
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

model = YOLO(r"../backend/models/best.pt")  # Adjust path if needed

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
        results = model(frame)

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
                    
                    # Count persons and safety violations
                    if class_name.lower() == "person":
                        total_persons += 1
                    elif class_name.startswith("NO-") or "without" in class_name.lower():
                        persons_without_safety_gear += 1
                    elif class_name.lower() in ["hardhat", "mask", "safety vest", "safety_vest", "vest"]:
                        persons_with_safety_gear += 1
                        
                    # Draw bounding box and label
                    color = (0, 255, 0) if not (class_name.startswith("NO-") or "without" in class_name.lower()) else (0, 0, 255)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{class_name} {confidence:.2f}"
                    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Update global stats with thread safety
        with stats_lock:
            stats["total_persons"] = total_persons
            stats["persons_without_safety_gear"] = persons_without_safety_gear
            stats["persons_with_safety_gear"] = persons_with_safety_gear
            stats["percentage_without_gear"] = (
                (persons_without_safety_gear / total_persons * 100) if total_persons > 0 else 0.0
            )
            stats["percentage_with_gear"] = (
                (persons_with_safety_gear / total_persons * 100) if total_persons > 0 else 0.0
            )
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            frame = buffer.tobytes()

            # Yield frame in byte format for streaming
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    if camera_active and camera is not None:
        return Response(generate_frames(), 
                       mimetype='multipart/x-mixed-replace; boundary=frame')
    else:
        # Return a black frame if camera is not active
        blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        ret, buffer = cv2.imencode('.jpg', blank_frame)
        frame = buffer.tobytes()
        
        def generate_blank():
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        
        return Response(generate_blank(), 
                       mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_camera', methods=['POST'])
def start_camera():
    global camera, camera_active
    
    try:
        if not camera_active:
            camera = cv2.VideoCapture(0)
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
                return jsonify({"status": "Failed to start camera"}), 500
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

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    finally:
        # Cleanup on exit
        if camera is not None:
            camera.release()
            cv2.destroyAllWindows()