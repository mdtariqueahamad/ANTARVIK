from typing import Dict, Any

class ForecastService:
    def __init__(self):
        # In a real scenario, this would load a scikit-learn or PyTorch model.
        # For the hackathon, we use deterministic physics/math to simulate the ML output.
        pass

    def predict_fuel_depletion(self, current_fuel_l: float, daily_burn_rate_l: float, winter_storm_factor: float = 1.0) -> Dict[str, Any]:
        """
        Predicts when fuel will run out, taking into account weather severity.
        """
        if daily_burn_rate_l <= 0:
            return {"days_remaining": 999, "status": "stable"}
            
        effective_burn_rate = daily_burn_rate_l * winter_storm_factor
        days_remaining = current_fuel_l / effective_burn_rate
        
        status = "normal"
        if days_remaining < 30:
            status = "critical"
        elif days_remaining < 60:
            status = "warning"
            
        return {
            "predicted_days_remaining": round(days_remaining),
            "effective_daily_burn_l": round(effective_burn_rate),
            "status": status,
            "message": f"Diesel reserve may fall below operational threshold in {round(days_remaining)} days."
        }

forecast_service = ForecastService()
