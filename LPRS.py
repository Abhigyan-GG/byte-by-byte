from ultralytics import YOLO
import cv2
model = YOLO("yolov8n.pt")  
image_path = "C:/Users/Hemant/Downloads/car.jpg"
image = cv2.imread(image_path)
results = model(image)
# Show results
results[0].show()  
