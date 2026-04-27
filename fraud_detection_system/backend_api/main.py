from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from schemas import TransactionRequest, PredictionResponse
from ml_services import FraudDetectionService

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Load the model at startup using Singleton
        FraudDetectionService()
        print("[Startup] ML model loaded and ready.")
    except Exception as exc:
        print(f"[Startup WARNING] {exc}")
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

@app.post("/api/v1/predict/advanced", response_model=PredictionResponse)
async def predict_advanced(data: TransactionRequest) -> PredictionResponse:
    try:
        service = FraudDetectionService()
        return service.predict(data)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")