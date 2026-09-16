from dataclasses import dataclass
from typing import Optional, Dict, Any

from app.simulators.environment import EnvironmentState
from app.simulators.energy import MicrogridState

@dataclass
class LogisticsState:
    """Tracks the logistics and consumable status."""
    current_fuel_litres: float
    daily_fuel_burn: float
    days_until_resupply: float

class CouplingEngine:
    """
    Cross-Domain Coupling Engine
    Monitors interacting effects across domains and triggers cascading alerts.
    """

    def __init__(self):
        pass

    def evaluate_cascading_risks(
        self,
        env: EnvironmentState,
        grid: MicrogridState,
        logistics: LogisticsState
    ) -> Optional[Dict[str, str]]:
        """
        Evaluates the cross-domain cascading risks.
        Specifically monitors the Red Alert chain:
        Environment Temp Drops -> Heating Load Spikes -> Diesel Burn Rate Climbs -> 
        Fuel-out date moves earlier and crosses the Resupply Window.
        
        Calculates the new projected fuel exhaustion date based on the current burn rate.
        """
        # Determine the current daily fuel burn based on the microgrid state if active.
        current_burn_rate_lph = sum(g.fuel_rate_lph for g in grid.gensets) if grid.gensets else 0.0
        daily_burn_rate = current_burn_rate_lph * 24.0

        # Fallback to the default logistics daily_fuel_burn if microgrid burn is zero or not provided.
        if daily_burn_rate <= 0:
            daily_burn_rate = logistics.daily_fuel_burn
            
        if daily_burn_rate <= 0:
            return None # No fuel burn, no risk of exhaustion

        # Calculate new projected fuel exhaustion date based on the current burn rate
        days_until_exhaustion = logistics.current_fuel_litres / daily_burn_rate

        # If exhaustion date moves earlier and crosses the resupply window, trigger RED_ALERT
        if days_until_exhaustion < logistics.days_until_resupply:
            return {
                "type": "RED_ALERT",
                "message": "Fuel exhaustion date has crossed the resupply window due to extreme heating load.",
                "recommended_action": "Initiate Tier 2 Load Shedding"
            }

        return None
