# app.py – Flask backend with GPU‑accelerated YOLO inference
# Supports: Webcam | Phone Camera (IP Webcam) | CCTV (RTSP)
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
print(f"[INFO] Using device: {device}")

model_path = os.path.join(os.path.dirname(__file__), "models", "best.pt")
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model not found at {model_path}")

model = YOLO(model_path)
model.to(device)

# ---------- 2. Global state ----------
camera = None
camera_active = False
stats_lock = threading.Lock()

latest_raw_frame = None
latest_processed_frame = None
frame_lock = threading.Lock()

# ✅ NEW: Camera source config
camera_source = {
    "type": "webcam",       # "webcam" | "phone" | "cctv"
    "phone_url": "",        # e.g. http://192.168.1.5:8080/video
    "rtsp_url": ""          # e.g. rtsp://admin:pass@192.168.1.10:554/stream
}

stats = {
    "total_persons": 0,
    "persons_without_safety_gear": 0,
    "persons_with_safety_gear": 0,
    "percentage_without_gear": 0.0,
    "percentage_with_gear": 0.0
}

# ---------- 3. Configuration ----------
SKIP_FRAMES = 2
JPEG_QUALITY = 85
TARGET_FPS = 30
FRAME_W, FRAME_H = 640, 480

# ---------- 4. Helper functions ----------
def open_webcam():
    """Open local webcam (index 0-2)."""
    is_windows = platform.system() == "Windows"
    for index in [0, 1, 2]:
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) if is_windows else cv2.VideoCapture(index)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
            cap.set(cv2.CAP_PROP_FPS, TARGET_FPS)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            for _ in range(3):
                cap.read()
            print(f"[INFO] Webcam opened at index {index}")
            return cap
        cap.release()
    return None

def open_phone_camera(url: str):
    """
    Open phone camera via IP Webcam app.
    URL format: http://<phone_ip>:8080/video
    The app streams MJPEG, which OpenCV handles natively.
    """
    if not url:
        print("[ERROR] Phone camera URL is empty.")
        return None
    cap = cv2.VideoCapture(url)
    if cap.isOpened():
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        print(f"[INFO] Phone camera opened: {url}")
        return cap
    print(f"[ERROR] Could not open phone camera at {url}")
    return None

def open_cctv_camera(rtsp_url: str):
    """
    Open CCTV camera via RTSP stream.
    URL format: rtsp://<user>:<pass>@<ip>:<port>/<stream_path>
    Uses FFMPEG backend for reliable RTSP handling.
    """
    if not rtsp_url:
        print("[ERROR] RTSP URL is empty.")
        return None
    # CAP_FFMPEG is the most reliable backend for RTSP
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if cap.isOpened():
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        # RTSP-specific: reduce latency by using TCP transport
        # (some cameras need UDP; switch if TCP fails)
        print(f"[INFO] CCTV camera opened: {rtsp_url}")
        return cap
    print(f"[ERROR] Could not open CCTV at {rtsp_url}")
    return None

def open_camera():
    """Route to the correct camera opener based on camera_source['type']."""
    src_type = camera_source["type"]
    if src_type == "webcam":
        return open_webcam()
    elif src_type == "phone":
        return open_phone_camera(camera_source["phone_url"])
    elif src_type == "cctv":
        return open_cctv_camera(camera_source["rtsp_url"])
    else:
        print(f"[ERROR] Unknown camera type: {src_type}")
        return None

def reset_stats():
    with stats_lock:
        for k in stats:
            stats[k] = 0.0 if isinstance(stats[k], float) else 0

# ---------- 5. Threads ----------
def camera_reader_thread():
    """Continuously read frames – handles both local and network cameras."""
    global camera, camera_active, latest_raw_frame
    consecutive_failures = 0
    MAX_FAILURES = 30  # Allow brief network hiccups before giving up

    while camera_active and camera is not None and camera.isOpened():
        success, frame = camera.read()
        if not success:
            consecutive_failures += 1
            print(f"[WARN] Frame read failed ({consecutive_failures}/{MAX_FAILURES})")
            if consecutive_failures >= MAX_FAILURES:
                print("[ERROR] Too many consecutive failures. Stopping camera.")
                camera_active = False
                break
            time.sleep(0.05)
            continue

        consecutive_failures = 0  # reset on success

        # Flip only for webcam (mirroring makes sense for local cam only)
        frame = cv2.flip(frame, 1)

        # Resize network frames to target resolution for consistent inference
        if frame.shape[1] != FRAME_W or frame.shape[0] != FRAME_H:
            frame = cv2.resize(frame, (FRAME_W, FRAME_H))

        with frame_lock:
            latest_raw_frame = frame

def inference_thread():
    """Run YOLO inference independently – draws on latest raw frame."""
    global latest_processed_frame, camera_active
    frame_count = 0
    last_boxes = []

    while camera_active:
        with frame_lock:
            frame = latest_raw_frame.copy() if latest_raw_frame is not None else None

        if frame is None:
            time.sleep(0.01)
            continue

        frame_count += 1

        if frame_count % (SKIP_FRAMES + 1) == 0:
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

        annotated = frame.copy()
        for (x1, y1, x2, y2, conf, class_name, is_violation) in last_boxes:
            color = (0, 0, 255) if is_violation else (0, 255, 0)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated, f"{class_name} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

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
        time.sleep(1 / TARGET_FPS)

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

# ✅ NEW: Set camera source before starting
@app.route('/set_source', methods=['POST', 'OPTIONS'])
def set_source():
    """
    Set the camera source. Must be called BEFORE /start_camera.
    Body (JSON):
      { "type": "webcam" }
      { "type": "phone",  "phone_url": "http://192.168.1.5:8080/video" }
      { "type": "cctv",   "rtsp_url":  "rtsp://admin:pass@192.168.1.10:554/stream1" }
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    if camera_active:
        return jsonify({
            "status": "error",
            "detail": "Stop the camera first before switching source."
        }), 400

    data = request.get_json(force=True)
    src_type = data.get("type", "").lower()

    if src_type not in ("webcam", "phone", "cctv"):
        return jsonify({"status": "error", "detail": "type must be webcam | phone | cctv"}), 400

    camera_source["type"] = src_type

    if src_type == "phone":
        url = data.get("phone_url", "").strip()
        if not url:
            return jsonify({"status": "error", "detail": "phone_url is required for type=phone"}), 400
        camera_source["phone_url"] = url

    elif src_type == "cctv":
        url = data.get("rtsp_url", "").strip()
        if not url:
            return jsonify({"status": "error", "detail": "rtsp_url is required for type=cctv"}), 400
        camera_source["rtsp_url"] = url

    return jsonify({"status": "Source updated", "camera_source": camera_source}), 200

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
                "status": "error",
                "detail": f"Could not open {camera_source['type']} camera. Check URL/connection."
            }), 500

        camera = cam
        camera_active = True
        reset_stats()

        threading.Thread(target=camera_reader_thread, daemon=True).start()
        threading.Thread(target=inference_thread, daemon=True).start()

        return jsonify({
            "status": "Camera started",
            "source": camera_source["type"]
        }), 200
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

@app.route('/get_source')
def get_source():
    """Return the currently configured camera source."""
    return jsonify(camera_source)

@app.route('/health')
def health_check():
    return jsonify({
        "status": "Backend running",
        "camera_active": camera_active,
        "device": device,
        "source": camera_source["type"]
    })

# ---------- 7. Run ----------
if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True, threaded=True, use_reloader=False)
