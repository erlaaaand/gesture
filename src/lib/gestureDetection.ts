// CV Specialist Agent: gestureDetection.ts
// Handles all gesture logic from MediaPipe hand landmarks

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureResult {
  isPeaceGesture: boolean;
  isPinchGesture: boolean;
  indexFingerTip: { x: number; y: number } | null;
  handedness: string;
}

// MediaPipe landmark indices
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_MCP = 17;
const WRIST = 0;

// Check if a finger is extended (tip above MCP joint)
function isFingerExtended(
  landmarks: HandLandmark[],
  tipIdx: number,
  mcpIdx: number
): boolean {
  // "extended" means tip is higher (lower y value in image coords) than MCP
  return landmarks[tipIdx].y < landmarks[mcpIdx].y - 0.04;
}

// Check if thumb is extended (tip is further left/right than IP joint)
function isThumbExtended(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  return Math.abs(thumbTip.x - thumbMcp.x) > Math.abs(thumbIp.x - thumbMcp.x) + 0.02;
}

// Detect Peace gesture: index + middle extended, ring + pinky + thumb folded
export function detectPeaceGesture(landmarks: HandLandmark[]): boolean {
  const indexExtended = isFingerExtended(landmarks, INDEX_TIP, INDEX_MCP);
  const middleExtended = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_MCP);
  const ringFolded = !isFingerExtended(landmarks, RING_TIP, RING_MCP);
  const pinkyFolded = !isFingerExtended(landmarks, PINKY_TIP, PINKY_MCP);

  // Both index and middle must be up, ring and pinky must be down
  return indexExtended && middleExtended && ringFolded && pinkyFolded;
}

// Detect Pinch gesture: thumb tip close to index tip
export function detectPinchGesture(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const distance = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) +
    Math.pow(thumbTip.y - indexTip.y, 2)
  );
  return distance < 0.06;
}

// Map normalized landmark coordinates to pixel coordinates
// Applies mirroring for natural (mirror-like) feel
export function mapToPixelCoords(
  landmark: HandLandmark,
  videoWidth: number,
  videoHeight: number
): { x: number; y: number } {
  return {
    x: (1 - landmark.x) * videoWidth, // mirror X axis
    y: landmark.y * videoHeight,
  };
}

// Analyze all hands and return gesture results
export function analyzeHands(
  handsData: Array<{ landmarks: HandLandmark[]; handedness: string }>
): {
  isPeaceGestureDetected: boolean;
  isPinchGestureDetected: boolean;
  indexFingerScreenPos: { x: number; y: number } | null;
  handedness: string | null;
} {
  let isPeaceGestureDetected = false;
  let isPinchGestureDetected = false;
  let indexFingerScreenPos: { x: number; y: number } | null = null;
  let handedness: string | null = null;

  for (const hand of handsData) {
    if (detectPeaceGesture(hand.landmarks)) {
      isPeaceGestureDetected = true;
    }
    if (detectPinchGesture(hand.landmarks)) {
      isPinchGestureDetected = true;
    }
    // Use the first detected hand for cursor tracking
    if (!indexFingerScreenPos) {
      indexFingerScreenPos = {
        x: hand.landmarks[INDEX_TIP].x,
        y: hand.landmarks[INDEX_TIP].y,
      };
      handedness = hand.handedness;
    }
  }

  return {
    isPeaceGestureDetected,
    isPinchGestureDetected,
    indexFingerScreenPos,
    handedness,
  };
}