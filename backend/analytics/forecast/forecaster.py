import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional

class ForecasterEngine:
    """
    Modular forecasting pipeline prepared to host Prophet, ARIMA, XGBoost, and LightGBM models.
    """
    def __init__(self, model_type: str = "arima"):
        self.model_type = model_type.lower()
        
    def fit_predict(
        self, 
        history_dates: List[str], 
        history_values: List[float], 
        horizon_periods: int = 12
    ) -> List[Dict[str, Any]]:
        """
        Executes prediction forecasts.
        """
        if not history_dates or not history_values:
            return []
            
        # Standardize dates and values into pandas Series
        df = pd.DataFrame({
            "ds": pd.to_datetime(history_dates),
            "y": pd.to_numeric(history_values, errors='coerce')
        }).dropna().sort_values("ds")
        
        if len(df) < 5:
            # Insufficient points for regression models, fallback to rolling mean
            return self._fallback_forecast(df, horizon_periods)
            
        if self.model_type == "prophet":
            return self._forecast_prophet(df, horizon_periods)
        elif self.model_type == "arima":
            return self._forecast_arima(df, horizon_periods)
        elif self.model_type in ["xgboost", "lightgbm"]:
            return self._forecast_tree_models(df, horizon_periods)
        else:
            return self._fallback_forecast(df, horizon_periods)
            
    def _forecast_prophet(self, df: pd.DataFrame, horizon: int) -> List[Dict[str, Any]]:
        """
        Placeholder model hook for Facebook Prophet.
        """
        # Future: from prophet import Prophet
        # m = Prophet()
        # m.fit(df)
        # future = m.make_future_dataframe(periods=horizon)
        # forecast = m.predict(future)
        return self._fallback_forecast(df, horizon)
        
    def _forecast_arima(self, df: pd.DataFrame, horizon: int) -> List[Dict[str, Any]]:
        """
        Placeholder model hook for statsmodels ARIMA.
        """
        # Future: from statsmodels.tsa.arima.model import ARIMA
        # model = ARIMA(df['y'], order=(1, 1, 1))
        # res = model.fit()
        # forecast = res.forecast(steps=horizon)
        return self._fallback_forecast(df, horizon)
        
    def _forecast_tree_models(self, df: pd.DataFrame, horizon: int) -> List[Dict[str, Any]]:
        """
        Placeholder model hook for XGBoost or LightGBM supervised lags forecast.
        """
        # Future lag feature engineering + xgboost regressor fit
        return self._fallback_forecast(df, horizon)
        
    def _fallback_forecast(self, df: pd.DataFrame, horizon: int) -> List[Dict[str, Any]]:
        """
        Deterministic baseline: linear trend extrapolation + historic averages.
        """
        results = []
        try:
            last_date = df["ds"].iloc[-1]
            last_val = df["y"].iloc[-1]
            avg_val = df["y"].mean()
            
            # Simple linear regression trend extrapolation
            x = np.arange(len(df))
            y = df["y"].values
            slope, intercept = np.polyfit(x, y, 1) if len(df) > 1 else (0.0, avg_val)
            
            for i in range(1, horizon + 1):
                # Predict next timestamp increment (assumed monthly default)
                next_date = last_date + pd.DateOffset(months=i)
                next_val = slope * (len(df) + i - 1) + intercept
                
                # Floor projections to zero if negative and history is positive
                if next_val < 0 and (y >= 0).all():
                    next_val = 0.0
                    
                results.append({
                    "date": next_date.strftime("%Y-%m-%d"),
                    "value": round(float(next_val), 2),
                    "lowerBound": round(float(next_val * 0.85), 2),
                    "upperBound": round(float(next_val * 1.15), 2)
                })
        except Exception as e:
            print(f"[Forecaster baseline] Fallback prediction failed: {e}")
        return results
