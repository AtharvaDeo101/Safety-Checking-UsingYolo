# app.py – Flask backend with GPU‑accelerated YOLO inference
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import os
import platform
import threading
import time
import numpy as np
import torch
from ultralytics import YOLO

app = Flask(__name__)
CORS(app,
     origins=["http://localhost:3000"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"])

# ---------- 1. Load model on GPU if available ----------
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[INFO] Using device: {device}")  # [web:59][web:65]

model_path = os.path.join(os.path.dirname(__file__), "models", "best.pt")
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model not found at {model_path}")

model = YOLO(model_path)
model.to(device)  # Explicitly move model to GPU/CPU [web:63]

# ---------- 2. Global state ----------
camera = None
camera_active = False
stats_lock = threading.Lock()

# Shared frames between threads (no queue – always latest)
latest_raw_frame = None          # from camera
latest_processed_frame = None    # with bounding boxes drawn
frame_lock = threading.Lock()

stats = {
    "total_persons": 0,
    "persons_without_safety_gear": 0,
    "persons_with_safety_gear": 0,
    "percentage_without_gear": 0.0,
    "percentage_with_gear": 0.0
}

# ---------- 3. Configuration ----------
SKIP_FRAMES = 2      # Run YOLO every 3rd frame (adjust for your GPU load)
JPEG_QUALITY = 85    # Stream quality
TARGET_FPS = 30      # Cap output stream
FRAME_W, FRAME_H = 640, 480  # Downscale for faster inference

# ---------- 4. Helper functions ----------
def open_camera():
    is_windows = platform.system() == "Windows"
    for index in [0, 1, 2]:
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) if is_windows else cv2.VideoCapture(index)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
            cap.set(cv2.CAP_PROP_FPS, TARGET_FPS)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Prevent stale frame buildup [web:55]
            for _ in range(3):
                cap.read()
            return cap
        cap.release()
    return None

def reset_stats():
    with stats_lock:
        for k in stats:
            stats[k] = 0.0 if isinstance(stats[k], float) else 0

# ---------- 5. Threads ----------
def camera_reader_thread():
    """Continuously read frames from webcam – never blocked by inference."""
    global camera, camera_active, latest_raw_frame
    while camera_active and camera is not None and camera.isOpened():
        success, frame = camera.read()
        if not success:
            break
        frame = cv2.flip(frame, 1)
        with frame_lock:
            latest_raw_frame = frame

def inference_thread():
    """Run YOLO inference independently – draws on latest raw frame."""
    global latest_processed_frame, camera_active
    frame_count = 0
    last_boxes = []  # reuse detections on skipped frames

    while camera_active:
        with frame_lock:
            frame = latest_raw_frame.copy() if latest_raw_frame is not None else None

        if frame is None:
            time.sleep(0.01)
            continue

        frame_count += 1

        # Run YOLO only every (SKIP_FRAMES+1) frames
        if frame_count % (SKIP_FRAMES + 1) == 0:
            # ✅ GPU inference happens here – device set on model.load [web:65]
            results = model(frame, imgsz=320, verbose=False, device=device)
            last_boxes = []

            total_persons = 0
            persons_without = 0
            persons_with = 0

            for result in results:
                if result.boxes is not None and len(result.boxes) > 0:
                    boxes = result.boxes.xyxy.cpu().numpy()
                    confs = result.boxes.conf.cpu().numpy()
                    cls_ids = result.boxes.cls.cpu().numpy()
                    names = result.names

                    for i in range(len(boxes)):
                        x1, y1, x2, y2 = map(int, boxes[i])
                        conf = confs[i]
                        class_name = names[int(cls_ids[i])]
                        is_violation = class_name.startswith("no-") or "without" in class_name.lower()

                        last_boxes.append((x1, y1, x2, y2, conf, class_name, is_violation))

                        if class_name.lower() == "person":
                            total_persons += 1
                        elif is_violation:
                            persons_without += 1
                        elif class_name.lower() in ["hardhat", "mask", "safety vest", "safety_vest", "vest"]:
                            persons_with += 1

            with stats_lock:
                stats["total_persons"] = total_persons
                stats["persons_without_safety_gear"] = persons_without
                stats["persons_with_safety_gear"] = persons_with
                stats["percentage_without_gear"] = (persons_without / max(total_persons, 1)) * 100
                stats["percentage_with_gear"] = (persons_with / max(total_persons, 1)) * 100

        # Draw last known boxes on EVERY frame → smooth visuals
        annotated = frame.copy()
        for (x1, y1, x2, y2, conf, class_name, is_violation) in last_boxes:
            color = (0, 0, 255) if is_violation else (0, 255, 0)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated, f"{class_name} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Encode to JPEG
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        ret, buffer = cv2.imencode('.jpg', annotated, encode_params)
        if ret:
            with frame_lock:
                latest_processed_frame = buffer.tobytes()

def generate_frames():
    """MJPEG generator – serves the latest processed frame."""
    global camera_active
    while camera_active:
        with frame_lock:
            frame_bytes = latest_processed_frame

        if frame_bytes is None:
            time.sleep(0.01)
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(1 / TARGET_FPS)  # Cap stream rate

# ---------- 6. Routes ----------
@app.route('/video_feed')
def video_feed():
    if camera_active:
        return Response(generate_frames(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    else:
        blank = np.zeros((FRAME_H, FRAME_W, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', blank)
        frame_bytes = buffer.tobytes()

        def generate_blank():
            while True:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(1 / 10)

        return Response(generate_blank(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_camera', methods=['POST', 'OPTIONS'])
def start_camera():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    global camera, camera_active
    try:
        if camera_active:
            return jsonify({"status": "Camera already running"}), 200

        cam = open_camera()
        if cam is None:
            return jsonify({
                "status": "Failed to start camera (check webcam connection)",
                "detail": "cv2.VideoCapture could not open any camera index (0-2)."
            }), 500

        camera = cam
        camera_active = True
        reset_stats()

        # Start threads
        threading.Thread(target=camera_reader_thread, daemon=True).start()
        threading.Thread(target=inference_thread, daemon=True).start()

        return jsonify({"status": "Camera started"}), 200
    except Exception as e:
        return jsonify({"status": f"Error starting camera: {str(e)}"}), 500

@app.route('/stop_camera', methods=['POST', 'OPTIONS'])
def stop_camera():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    global camera, camera_active
    try:
        if camera_active:
            camera_active = False
            time.sleep(0.3)
            if camera is not None:
                camera.release()
                camera = None
            reset_stats()
            return jsonify({"status": "Camera stopped"}), 200
        return jsonify({"status": "Camera not running"}), 200
    except Exception as e:
        return jsonify({"status": f"Error stopping camera: {str(e)}"}), 500

@app.route('/get_stats')
def get_stats():
    with stats_lock:
        return jsonify(stats.copy())

@app.route('/health')
def health_check():
    return jsonify({"status": "Backend running",
                    "camera_active": camera_active,
                    "device": device})  # Show whether GPU/CPU is active

# ---------- 7. Run ----------
if __name__ == '__main__':
    # use_reloader=False prevents Flask from spawning a child process that fights for the webcam
    app.run(host='localhost', port=5000, debug=True, threaded=True, use_reloader=False)
