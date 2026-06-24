from fastapi import APIRouter, HTTPException
from backend.models.schemas import PoseAnalysisRequest, PoseAnalysisResponse, LandmarkPoint, CompensationFlag
from backend.services.pose_service import pose_service
from backend.services.biomechanics import calculate_all_angles
from backend.services.symmetry import calculate_symmetry
from backend.services.compensation import detect_compensations

router = APIRouter(prefix="/api/pose", tags=["pose"])


@router.post("/analyze", response_model=PoseAnalysisResponse)
async def analyze_pose(req: PoseAnalysisRequest):
    """Analyze a single image frame for pose landmarks and biomechanics."""
    try:
        result = pose_service.detect_from_base64(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {e}")

    if not result.pose_landmarks:
        raise HTTPException(status_code=422, detail="No pose detected in image")

    landmarks_data = pose_service.landmarks_to_dict(result)

    # Use first detected pose
    primary_landmarks = landmarks_data[0]
    angles = calculate_all_angles(primary_landmarks)
    symmetry = calculate_symmetry(angles)
    compensations = detect_compensations(primary_landmarks, "general")

    # Convert landmarks to response format
    landmarks_response = [
        [LandmarkPoint(**lm) for lm in pose]
        for pose in landmarks_data
    ]

    return PoseAnalysisResponse(
        landmarks=landmarks_response,
        joint_angles=angles,
        symmetry=symmetry,
        compensations=[CompensationFlag(**c) for c in compensations],
        rom=angles,  # Single frame ROM = current angles
    )
