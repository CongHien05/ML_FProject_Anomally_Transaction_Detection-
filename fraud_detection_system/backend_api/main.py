import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import (
    get_dashboard_summary,
    init_db,
    list_prediction_logs,
    save_prediction_log,
    update_log_review,
)
from schemas import LogReviewRequest, TransactionRequest, PredictionResponse
from ml_services import FraudDetectionService

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Load the model at startup using Singleton
        FraudDetectionService()
        print("[Startup] ML model loaded and ready.")
    except Exception as exc:
        print(f"[Startup WARNING] {exc}")

    try:
        init_db()
        print("[Startup] MySQL database ready.")
    except Exception as exc:
        print(f"[Startup DB WARNING] {exc}")

    yield
    print("[Shutdown] Fraud Detection API stopped.")

app = FastAPI(
    title="Fraud Detection API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "fraud-detection-api"}

@app.post("/api/v1/predict/advanced", response_model=PredictionResponse)
async def predict_advanced(data: TransactionRequest) -> PredictionResponse:
    try:
        service = FraudDetectionService()
        prediction = service.predict(data)

        try:
            prediction.log_id = save_prediction_log(data, prediction)
        except Exception as exc:
            print(f"[DB WARNING] Prediction succeeded but log was not saved: {exc}")

        return prediction
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

@app.get("/api/v1/admin/logs")
async def get_admin_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    risk: str | None = Query(None),
    tx_type: str | None = Query(None),
    search: str | None = Query(None),
):
    try:
        return list_prediction_logs(page=page, limit=limit, risk=risk, tx_type=tx_type, search=search)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Logs error: {exc}")

@app.get("/api/v1/admin/dashboard/summary")
async def get_admin_dashboard_summary():
    try:
        return get_dashboard_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {exc}")

@app.get("/api/v1/admin/model/info")
async def get_model_info():
    model_file = os.getenv("MODEL_FILE", os.getenv("MODEL_VERSION", "fraud_detection_pipeline.pkl"))
    try:
        service = FraudDetectionService()
        return {
            "status": "loaded",
            "model_file": os.path.basename(getattr(service, "model_path", model_file)),
            "model_path": getattr(service, "model_path", None),
        }
    except Exception as exc:
        return {"status": "unavailable", "model_file": model_file, "detail": str(exc)}

@app.patch("/api/v1/admin/logs/{log_id}/review")
async def review_log(log_id: int, payload: LogReviewRequest):
    try:
        updated = update_log_review(log_id, payload.review_status, payload.review_note)
        if updated == 0:
            raise HTTPException(status_code=404, detail="Log not found")
        return {"status": "success", "updated": updated}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Review update error: {exc}")
