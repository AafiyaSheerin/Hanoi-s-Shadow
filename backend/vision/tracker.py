import cv2
import numpy as np
import base64
import mediapipe as mp

# ── MediaPipe Hands (old API — no model download needed) ──────────────────────
_mp_hands = mp.solutions.hands
_hands = _mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.5,
)
_mp_draw = mp.solutions.drawing_utils
_mp_draw_styles = mp.solutions.drawing_styles

FINGERTIPS  = [4, 8, 12, 16, 20]
FINGER_MCPS = [2, 5,  9, 13, 17]


def _count_fingers(landmarks):
    pts = [(lm.x, lm.y) for lm in landmarks.landmark]
    count = 0
    # Thumb — compare x
    if abs(pts[4][0] - pts[2][0]) > 0.04:
        count += 1
    # Other fingers — tip y < mcp y means extended
    for tip, mcp in zip(FINGERTIPS[1:], FINGER_MCPS[1:]):
        if pts[tip][1] < pts[mcp][1]:
            count += 1
    return count


def process_frame(base64_image: str) -> dict:
    # ── decode ────────────────────────────────────────────────────────────────
    if "," in base64_image:
        base64_image = base64_image.split(",", 1)[1]
    img_bytes = base64.b64decode(base64_image)
    arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return _empty(base64_image)

    frame = cv2.flip(frame, 1)
    img_h, img_w = frame.shape[:2]

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = _hands.process(rgb)

    output = frame.copy()

    if results.multi_hand_landmarks:
        hand = results.multi_hand_landmarks[0]

        # Draw skeleton — green lines + red dots (exact look from image)
        _mp_draw.draw_landmarks(
            output,
            hand,
            _mp_hands.HAND_CONNECTIONS,
            landmark_drawing_spec=_mp_draw.DrawingSpec(
                color=(0, 0, 255), thickness=-1, circle_radius=7   # red filled dots
            ),
            connection_drawing_spec=_mp_draw.DrawingSpec(
                color=(0, 255, 0), thickness=3                      # green lines
            ),
        )

        # Index fingertip (landmark 8) for zone control
        tip = hand.landmark[8]
        tip_x = int(tip.x * img_w)
        tip_y = int(tip.y * img_h)

        fingers_up = _count_fingers(hand)

        if fingers_up == 0:
            gesture = "fist"
        elif fingers_up == 1:
            gesture = "pointing"
        elif fingers_up == 5:
            gesture = "open"
        elif fingers_up <= 2:
            gesture = "pinch"
        else:
            gesture = "unknown"

        landmark_px = [
            {"x": int(lm.x * img_w), "y": int(lm.y * img_h)}
            for lm in hand.landmark
        ]

        _, buf = cv2.imencode(".jpg", output, [cv2.IMWRITE_JPEG_QUALITY, 80])
        b64 = base64.b64encode(buf).decode()

        return {
            "annotated_frame": f"data:image/jpeg;base64,{b64}",
            "detected": True,
            "fingertip_x": tip_x,
            "fingertip_y": tip_y,
            "fingers_up": fingers_up,
            "gesture": gesture,
            "landmark_px": landmark_px,
        }

    # ── no hand detected ─────────────────────────────────────────────────────
    _, buf = cv2.imencode(".jpg", output, [cv2.IMWRITE_JPEG_QUALITY, 80])
    b64 = base64.b64encode(buf).decode()
    return {
        "annotated_frame": f"data:image/jpeg;base64,{b64}",
        "detected": False,
        "fingertip_x": None,
        "fingertip_y": None,
        "fingers_up": 0,
        "gesture": "unknown",
        "landmark_px": [],
    }


def _empty(b64):
    return {
        "annotated_frame": f"data:image/jpeg;base64,{b64}",
        "detected": False,
        "fingertip_x": None,
        "fingertip_y": None,
        "fingers_up": 0,
        "gesture": "unknown",
        "landmark_px": [],
    }