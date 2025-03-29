from flask import Flask, Response, jsonify
import cv2
from ultralytics import YOLO
import numpy as np

app = Flask(__name__)

# Load the trained YOLO model
model = YOLO(r"..\backend\models\best.pt")  # Adjust path if needed

camera = None

def generate_frames():
    camera = cv2.VideoCapture(0)  # Use 0 for default webcam


    while True:
        success, frame = camera.read()
        if not success:
            break

        # Perform YOLO inference
        results = model(frame)

        # Process detections
        for result in results:
            boxes = result.boxes.xyxy.cpu().numpy()  # Bounding boxes
            confidences = result.boxes.conf.cpu().numpy()  # Confidence scores
            class_ids = result.boxes.cls.cpu().numpy()  # Class IDs
            class_names = result.names  # Class names dictionary

            for i in range(len(boxes)):
                x1, y1, x2, y2 = map(int, boxes[i])
                confidence = confidences[i]
                class_id = int(class_ids[i])
                class_name = class_names[class_id]

                # Draw bounding box and label
                color = (0, 255, 0) if not class_name.startswith("NO-") else (0, 0, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                label = f"{class_name} {confidence:.2f}"
                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        # Yield frame in byte format for streaming
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_camera', methods=['POST'])
def start_camera():
    global camera
    if camera is None or not camera.isOpened():
        camera = cv2.VideoCapture(0)
        return jsonify({"status": "Camera started"}), 200
    return jsonify({"status": "Camera already running"}), 200

@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    global camera
    if camera is not None and camera.isOpened():
        camera.release()
        camera = None
        return jsonify({"status": "Camera stopped"}), 200
    return jsonify({"status": "Camera not running"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)