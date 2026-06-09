import base64
import cv2
import numpy as np
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.game_logic import TowerOfHanoi
from core.ai_solver import TowerSolver
from vision.tracker import process_frame

app = FastAPI(title="Tower of Hanoi Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

game_engine = TowerOfHanoi(num_disks=3)
ai_agent = TowerSolver()

class FrameData(BaseModel):
    image: str

@app.get("/api/state")
def get_current_state():
    return game_engine.get_state()

@app.post("/api/process-frame")
def handle_frame(data: FrameData):
    try:
        result = process_frame(data.image)

        active_zone = -1
        if result["detected"] and result["fingertip_x"] is not None:
            x = result["fingertip_x"]
            if x < 213:
                active_zone = 0
            elif x < 426:
                active_zone = 1
            else:
                active_zone = 2

        return {
            "pointer": [result["fingertip_x"], result["fingertip_y"]] if result["detected"] else None,
            "active_zone": active_zone,
            "annotated_frame": result["annotated_frame"],
            "fingers_up": result["fingers_up"],
            "gesture": result["gesture"],
            "game_state": game_engine.get_state()
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/action")
def execute_game_action(action: dict):
    global game_engine
    command = action.get("command")
    zone = action.get("zone")
    disks = action.get("disks", 3)

    if command == "interact" and zone is not None and zone >= 0:
        if game_engine.selected_disk is None:
            success = game_engine.select_disk(zone)
            msg = "Grabbed disk." if success else "Empty peg."
        else:
            success = game_engine.place_disk(zone)
            msg = "Placed disk." if success else "Illegal move."
        return {"success": success, "message": msg, "state": game_engine.get_state()}

    elif command == "reset":
        game_engine = TowerOfHanoi(num_disks=disks)
        return {"success": True, "message": "Reset complete.", "state": game_engine.get_state()}

    elif command == "undo":
        success = game_engine.undo_move()
        msg = "Rewound last step!" if success else "Nothing to undo."
        return {"success": success, "message": msg, "state": game_engine.get_state()}

    raise HTTPException(status_code=400, detail="Invalid request parameters.")

@app.get("/api/ai-solution")
def get_ai_steps():
    steps = ai_agent.calculate_steps(game_engine.num_disks)
    return {"steps": steps}

@app.post("/api/debug-hsv")
def debug_hsv(data: FrameData):
    encoded = data.image.split(',')[1]
    nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape
    cx, cy = w // 2, h // 2
    patch = frame[cy-30:cy+30, cx-30:cx+30]
    hsv_patch = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
    return {
        "avg": {
            "H": int(np.mean(hsv_patch[:,:,0])),
            "S": int(np.mean(hsv_patch[:,:,1])),
            "V": int(np.mean(hsv_patch[:,:,2]))
        }
    }