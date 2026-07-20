import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from db import EodEntry, BusinessVertical

def calculate_business_kpis(db: Session, business_id: str) -> dict:
    """
    Computes key performance indicators (KPIs) for the business.
    """
    eods = db.query(EodEntry).filter(EodEntry.businessId == business_id).all()
    if not eods:
        return {
            "total_revenue": 0.0,
            "total_units_sold": 0,
            "total_deals_closed": 0,
            "average_revenue_per_entry": 0.0,
            "revenue_variance": 0.0
        }

    # Convert to DataFrame
    df = pd.DataFrame([
        {
            "revenue": e.revenueAmount / 100.0, # cents to rupees/dollars
            "units": e.unitsSold,
            "deals": e.dealsClosed
        } for e in eods
    ])

    total_revenue = float(df["revenue"].sum())
    total_units = int(df["units"].sum())
    total_deals = int(df["deals"].sum())
    avg_rev = float(df["revenue"].mean())
    rev_var = float(df["revenue"].var()) if len(df) > 1 else 0.0

    return {
        "total_revenue": round(total_revenue, 2),
        "total_units_sold": total_units,
        "total_deals_closed": total_deals,
        "average_revenue_per_entry": round(avg_rev, 2),
        "revenue_variance": round(rev_var, 2)
    }

def analyze_revenue_trends(db: Session, business_id: str) -> list[dict]:
    """
    Computes EOD revenue trends and simple forecasting.
    """
    eods = db.query(EodEntry).filter(EodEntry.businessId == business_id).all()
    if not eods:
        return []

    # Load into DataFrame and sort by date
    df = pd.DataFrame([
        {
            "date": pd.to_datetime(e.entryDate),
            "revenue": e.revenueAmount / 100.0
        } for e in eods
    ]).sort_values("date")

    # Group by date and calculate running sums / moving averages
    daily = df.groupby("date")["revenue"].sum().reset_index()
    daily["running_total"] = daily["revenue"].cumsum()
    daily["moving_avg_3day"] = daily["revenue"].rolling(window=3, min_periods=1).mean()

    # Simple linear extrapolation for 3-day forecast if we have at least 2 days
    forecast_next_3_days = []
    if len(daily) >= 2:
        x = np.arange(len(daily))
        y = daily["revenue"].values
        slope, intercept = np.polyfit(x, y, 1)
        
        last_date = daily["date"].max()
        for i in range(1, 4):
            fut_date = last_date + pd.Timedelta(days=i)
            fut_val = slope * (len(daily) + i - 1) + intercept
            forecast_next_3_days.append({
                "date": fut_date.strftime("%Y-%m-%d"),
                "forecasted_revenue": round(max(0.0, float(fut_val)), 2),
                "is_forecast": True
            })

    result = []
    for idx, row in daily.iterrows():
        result.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "revenue": round(float(row["revenue"]), 2),
            "running_total": round(float(row["running_total"]), 2),
            "moving_average": round(float(row["moving_avg_3day"]), 2),
            "is_forecast": False
        })
    
    result.extend(forecast_next_3_days)
    return result

def check_revenue_anomalies(db: Session, business_id: str) -> list[dict]:
    """
    Identifies abnormal drops or spikes in EOD entries using simple standard deviation thresholds.
    """
    eods = db.query(EodEntry).filter(EodEntry.businessId == business_id).all()
    if len(eods) < 5:
        return [] # not enough history for statistics

    df = pd.DataFrame([
        {
            "id": e.id,
            "date": e.entryDate.strftime("%Y-%m-%d"),
            "revenue": e.revenueAmount / 100.0
        } for e in eods
    ])

    mean = df["revenue"].mean()
    std = df["revenue"].std()
    
    # Define threshold (e.g., 2 standard deviations away)
    anomalies = []
    for idx, row in df.iterrows():
        val = row["revenue"]
        if val < (mean - 1.5 * std):
            anomalies.append({
                "id": row["id"],
                "date": row["date"],
                "revenue": val,
                "type": "drop",
                "message": f"Significant drop in revenue: {val} (Average: {round(mean, 2)})"
            })
        elif val > (mean + 1.5 * std):
            anomalies.append({
                "id": row["id"],
                "date": row["date"],
                "revenue": val,
                "type": "spike",
                "message": f"Revenue spike detected: {val} (Average: {round(mean, 2)})"
            })

    return anomalies
