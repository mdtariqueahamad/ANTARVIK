"""Winter-over risk index computation.

Composite score 0-100 with explainable sub-scores:
  - fuel_margin_days: days of fuel beyond next resupply
  - food_days: days of food remaining
  - medical_days: days of medical supplies
  - power_redundancy: N-1 / N-2 genset redundancy
  - storm_exposure: current weather severity
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryItem, ResupplyWindow
from app.models.station import Asset


@dataclass
class RiskComponent:
    """A single component of the risk index."""
    name: str
    score: float          # 0-100 (higher = riskier)
    weight: float         # contribution weight
    weighted_score: float
    detail: str           # human-readable explanation


@dataclass
class RiskIndex:
    """Composite risk index for a station."""
    station_id: str
    overall_score: float  # 0-100
    level: str            # low | moderate | elevated | high | critical
    components: List[RiskComponent] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

    @staticmethod
    def level_from_score(score: float) -> str:
        if score < 20:
            return "low"
        elif score < 40:
            return "moderate"
        elif score < 60:
            return "elevated"
        elif score < 80:
            return "high"
        return "critical"


class RiskService:
    """Compute explainable winter-over risk index."""

    # Component weights (must sum to ~1.0)
    WEIGHTS = {
        "fuel_margin": 0.30,
        "food_days": 0.15,
        "medical_days": 0.10,
        "power_redundancy": 0.25,
        "storm_exposure": 0.10,
        "equipment_health": 0.10,
    }

    async def compute_risk(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
        env_state: Optional[dict] = None,
        energy_state: Optional[dict] = None,
        equipment_summary: Optional[Dict[str, dict]] = None,
    ) -> RiskIndex:
        """Compute the composite risk index.

        Uses database state plus optional real-time simulation state.
        """
        components: List[RiskComponent] = []
        recommendations: List[str] = []

        # ── Fuel Margin ────────────────────────────────────────────────
        fuel_score, fuel_detail = await self._fuel_margin_risk(db, station_id)
        components.append(RiskComponent(
            name="fuel_margin",
            score=fuel_score,
            weight=self.WEIGHTS["fuel_margin"],
            weighted_score=fuel_score * self.WEIGHTS["fuel_margin"],
            detail=fuel_detail,
        ))
        if fuel_score > 60:
            recommendations.append("Initiate fuel conservation protocols")
        if fuel_score > 80:
            recommendations.append("URGENT: Request emergency fuel resupply")

        # ── Food Days ──────────────────────────────────────────────────
        food_score, food_detail = await self._consumable_risk(db, station_id, "food")
        components.append(RiskComponent(
            name="food_days",
            score=food_score,
            weight=self.WEIGHTS["food_days"],
            weighted_score=food_score * self.WEIGHTS["food_days"],
            detail=food_detail,
        ))
        if food_score > 60:
            recommendations.append("Implement food rationing plan")

        # ── Medical Days ───────────────────────────────────────────────
        med_score, med_detail = await self._consumable_risk(db, station_id, "medical")
        components.append(RiskComponent(
            name="medical_days",
            score=med_score,
            weight=self.WEIGHTS["medical_days"],
            weighted_score=med_score * self.WEIGHTS["medical_days"],
            detail=med_detail,
        ))
        if med_score > 60:
            recommendations.append("Review medical supply inventory and prioritize")

        # ── Power Redundancy ───────────────────────────────────────────
        power_score, power_detail = self._power_redundancy_risk(energy_state)
        components.append(RiskComponent(
            name="power_redundancy",
            score=power_score,
            weight=self.WEIGHTS["power_redundancy"],
            weighted_score=power_score * self.WEIGHTS["power_redundancy"],
            detail=power_detail,
        ))
        if power_score > 50:
            recommendations.append("Schedule maintenance on standby generators")
        if power_score > 75:
            recommendations.append("URGENT: Restore generator redundancy")

        # ── Storm Exposure ─────────────────────────────────────────────
        storm_score, storm_detail = self._storm_risk(env_state)
        components.append(RiskComponent(
            name="storm_exposure",
            score=storm_score,
            weight=self.WEIGHTS["storm_exposure"],
            weighted_score=storm_score * self.WEIGHTS["storm_exposure"],
            detail=storm_detail,
        ))
        if storm_score > 60:
            recommendations.append("Execute storm preparedness protocols")

        # ── Equipment Health ───────────────────────────────────────────
        equip_score, equip_detail = self._equipment_risk(equipment_summary)
        components.append(RiskComponent(
            name="equipment_health",
            score=equip_score,
            weight=self.WEIGHTS["equipment_health"],
            weighted_score=equip_score * self.WEIGHTS["equipment_health"],
            detail=equip_detail,
        ))
        if equip_score > 60:
            recommendations.append("Prioritize equipment maintenance backlog")

        # ── Composite Score ────────────────────────────────────────────
        overall = sum(c.weighted_score for c in components)
        overall = round(min(100.0, max(0.0, overall)), 1)

        return RiskIndex(
            station_id=str(station_id),
            overall_score=overall,
            level=RiskIndex.level_from_score(overall),
            components=components,
            recommendations=recommendations,
        )

    async def _fuel_margin_risk(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
    ) -> tuple:
        """Compute fuel margin risk score."""
        result = await db.execute(
            select(InventoryItem)
            .where(InventoryItem.station_id == station_id)
            .where(InventoryItem.category == "fuel")
        )
        fuel_items = result.scalars().all()

        total_fuel = sum(i.quantity for i in fuel_items)
        total_rate = sum(i.daily_consumption_rate for i in fuel_items)

        if total_rate <= 0:
            return 10.0, f"Fuel: {total_fuel:.0f}L, no consumption data"

        days_remaining = total_fuel / total_rate

        # Get next resupply
        resupply_result = await db.execute(
            select(ResupplyWindow)
            .where(ResupplyWindow.station_id == station_id)
            .where(ResupplyWindow.status.in_(["scheduled", "in_transit"]))
            .order_by(ResupplyWindow.expected_date)
            .limit(1)
        )
        resupply = resupply_result.scalar_one_or_none()

        if resupply and resupply.expected_date:
            days_to_resupply = (resupply.expected_date - date.today()).days
            margin = days_remaining - days_to_resupply

            if margin < 0:
                score = 100.0
            elif margin < 15:
                score = 90 - (margin * 2)
            elif margin < 30:
                score = 60 - (margin - 15) * 2
            elif margin < 60:
                score = 30 - (margin - 30)
            else:
                score = max(0, 10 - (margin - 60) * 0.1)

            detail = (f"Fuel: {days_remaining:.0f} days remaining, "
                      f"resupply in {days_to_resupply} days, margin {margin:.0f} days")
        else:
            # No resupply scheduled
            if days_remaining < 30:
                score = 90.0
            elif days_remaining < 90:
                score = 70 - (days_remaining - 30)
            elif days_remaining < 180:
                score = 30 - (days_remaining - 90) * 0.3
            else:
                score = 5.0
            detail = f"Fuel: {days_remaining:.0f} days remaining, no resupply scheduled"

        return round(max(0, min(100, score)), 1), detail

    async def _consumable_risk(
        self,
        db: AsyncSession,
        station_id: uuid.UUID,
        category: str,
    ) -> tuple:
        """Generic consumable risk scoring."""
        result = await db.execute(
            select(InventoryItem)
            .where(InventoryItem.station_id == station_id)
            .where(InventoryItem.category == category)
        )
        items = result.scalars().all()

        if not items:
            return 20.0, f"{category}: no data"

        total_qty = sum(i.quantity for i in items)
        total_rate = sum(i.daily_consumption_rate for i in items)

        if total_rate <= 0:
            return 10.0, f"{category}: {total_qty:.0f} units, no rate data"

        days = total_qty / total_rate
        if days < 15:
            score = 95.0
        elif days < 30:
            score = 80.0 - (days - 15)
        elif days < 90:
            score = 50.0 - (days - 30) * 0.5
        elif days < 180:
            score = 20.0 - (days - 90) * 0.1
        else:
            score = 5.0

        return round(max(0, min(100, score)), 1), f"{category}: {days:.0f} days remaining"

    def _power_redundancy_risk(self, energy_state: Optional[dict]) -> tuple:
        """Power redundancy risk based on genset availability."""
        if not energy_state:
            return 20.0, "Power: no real-time data"

        gensets = energy_state.get("gensets", [])
        total = len(gensets)
        operational = sum(1 for g in gensets if g.get("status") not in ("failed", "maintenance"))

        if total == 0:
            return 50.0, "Power: no generators configured"

        redundancy = operational - 1  # N-1 metric
        if redundancy <= 0:
            score = 90.0
            detail = f"Power: NO redundancy ({operational}/{total} operational)"
        elif redundancy == 1:
            score = 40.0
            detail = f"Power: N-1 redundancy ({operational}/{total} operational)"
        else:
            score = 10.0
            detail = f"Power: N-{redundancy} redundancy ({operational}/{total} operational)"

        return score, detail

    def _storm_risk(self, env_state: Optional[dict]) -> tuple:
        """Storm exposure risk."""
        if not env_state:
            return 10.0, "Weather: no real-time data"

        wind = env_state.get("wind_speed_ms", 0)
        temp = env_state.get("temperature_c", -20)
        is_storm = env_state.get("is_katabatic_storm", False)

        if is_storm:
            score = 80.0 + min(20, (wind - 35) * 2)
            detail = f"STORM: {wind:.0f}m/s, {temp:.0f}°C"
        elif wind > 25:
            score = 50.0 + (wind - 25)
            detail = f"High wind: {wind:.0f}m/s, {temp:.0f}°C"
        elif temp < -35:
            score = 40.0 + abs(temp + 35) * 2
            detail = f"Extreme cold: {temp:.0f}°C, wind {wind:.0f}m/s"
        else:
            score = max(0, 10 + wind * 0.5 + abs(min(0, temp + 20)) * 0.5)
            detail = f"Weather: {temp:.0f}°C, wind {wind:.0f}m/s"

        return round(min(100, max(0, score)), 1), detail

    def _equipment_risk(self, equipment_summary: Optional[Dict[str, dict]]) -> tuple:
        """Equipment health risk based on fleet average health."""
        if not equipment_summary:
            return 15.0, "Equipment: no monitoring data"

        healths = [e.get("health_pct", 100) for e in equipment_summary.values()]
        failed = sum(1 for e in equipment_summary.values() if e.get("is_failed"))
        avg_health = sum(healths) / len(healths) if healths else 100

        if failed > 0:
            score = 60 + failed * 15
            detail = f"Equipment: {failed} failed, avg health {avg_health:.0f}%"
        elif avg_health < 50:
            score = 60 - avg_health
            detail = f"Equipment: avg health {avg_health:.0f}% (poor)"
        elif avg_health < 70:
            score = 40 - (avg_health - 50) * 0.5
            detail = f"Equipment: avg health {avg_health:.0f}% (fair)"
        else:
            score = max(0, 20 - (avg_health - 70) * 0.5)
            detail = f"Equipment: avg health {avg_health:.0f}% (good)"

        return round(min(100, max(0, score)), 1), detail
