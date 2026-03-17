import os
import shutil
import random
import yaml
from ultralytics import YOLO

if __name__ == '__main__':

    # ── Step 1: Restructure Dataset ──────────────────────────────
    SOURCE_IMAGES = r"C:\Users\deoat\Downloads\licence_plate\images"
    SOURCE_LABELS = r"C:\Users\deoat\Downloads\licence_plate\labels"
    OUTPUT_DIR = r"C:\Users\deoat\Downloads\licence_plate"
    TRAIN_RATIO = 0.8

    for split in ["train", "val"]:
        os.makedirs(f"{OUTPUT_DIR}/images/{split}", exist_ok=True)
        os.makedirs(f"{OUTPUT_DIR}/labels/{split}", exist_ok=True)

    images = [f for f in os.listdir(SOURCE_IMAGES) if f.endswith((".jpg", ".jpeg", ".png"))]
    random.shuffle(images)

    split_idx = int(len(images) * TRAIN_RATIO)
    train_imgs = images[:split_idx]
    val_imgs   = images[split_idx:]

    def copy_files(file_list, split):
        for img_file in file_list:
            name = os.path.splitext(img_file)[0]
            label_file = name + ".txt"
            shutil.copy(
                os.path.join(SOURCE_IMAGES, img_file),
                os.path.join(OUTPUT_DIR, "images", split, img_file)
            )
            label_src = os.path.join(SOURCE_LABELS, label_file)
            if os.path.exists(label_src):
                shutil.copy(label_src, os.path.join(OUTPUT_DIR, "labels", split, label_file))

    copy_files(train_imgs, "train")
    copy_files(val_imgs, "val")
    print(f"Dataset ready! Train: {len(train_imgs)} | Val: {len(val_imgs)}")

    # ── Step 2: Create data.yaml ──────────────────────────────────
    data = {
        "path": os.path.abspath(OUTPUT_DIR),
        "train": "images/train",
        "val": "images/val",
        "nc": 1,
        "names": ["licence_plate"]
    }
    with open("data.yaml", "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    print("data.yaml created!")

    # ── Step 3: Train YOLO ────────────────────────────────────────
    model = YOLO("yolov8n.pt")
    model.train(
        data="data.yaml",
        epochs=100,
        imgsz=640,
        batch=8,
        workers=2,          # keep low on Windows to avoid multiprocessing issues
        name="indian_lp_detector"
    )
    print("Training complete! Model saved at runs/detect/indian_lp_detector/weights/best.pt")
