from fastapi import FastAPI, UploadFile, File, HTTPException
from io import BytesIO
from tensorflow.keras.utils import load_img, img_to_array
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import numpy as np
import tensorflow as tf
import os

DATASET_DIR = "dataset"
MODEL_PATH = "models/waste_classifier.h5"
IMG_SIZE = (224, 224)

app = FastAPI()

def train_model():
    datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=0.2
    )

    train_generator = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=32,
        class_mode='categorical',
        subset='training'
    )

    val_generator = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=32,
        class_mode='categorical',
        subset='validation'
    )

    model = tf.keras.models.Sequential([
        tf.keras.layers.Input(shape=(*IMG_SIZE, 3)),
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dense(train_generator.num_classes, activation='softmax')
    ])

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    model.fit(train_generator, validation_data=val_generator, epochs=10)

    os.makedirs("models", exist_ok=True)
    model.save(MODEL_PATH)
    print("✅ Model trained and saved!")

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Please train it first.")
    return tf.keras.models.load_model(MODEL_PATH)

def predict(image_data):
    model = load_model()
    prediction = model.predict(image_data)
    class_idx = tf.argmax(prediction, axis=1).numpy()[0]
    return int(class_idx)

def preprocess_image(file: UploadFile, target_size=IMG_SIZE):
    content = BytesIO(file.file.read())
    image = load_img(content, target_size=target_size)
    image_array = img_to_array(image)
    image_array = np.expand_dims(image_array, axis=0)
    image_array = image_array / 255.0
    return image_array

@app.post("/predict")
async def get_prediction(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(("png", "jpg", "jpeg")):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image_data = preprocess_image(file)
        result = predict(image_data)
        return {"prediction": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

train_model()
