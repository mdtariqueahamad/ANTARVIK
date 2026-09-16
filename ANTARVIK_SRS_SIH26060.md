# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
# Project: ANTARVIK — Digital Twin Platform for Maitri & Bharati Antarctic Research Stations
# PS: SIH26060 | Ministry of Earth Sciences / NCPOR | Theme: Smart Automation | Category: Software
# Version: 1.0 | Date: 2026-09-16

================================================================================
1. INTRODUCTION
================================================================================

1.1 Purpose
    Specify requirements for ANTARVIK, a federated, edge-first digital twin
    platform that gives NCPOR managers in India a live, predictive, coupled
    view of four operational domains of the Indian Antarctic stations Maitri
    and Bharati: (1) Infrastructure, (2) Energy, (3) Logistics, (4) Environment.

1.2 Scope
    IN SCOPE:
      - One shared platform connecting four domain twins via a common asset
        registry and coupling engine.
      - Synthetic-but-physically-plausible telemetry generation (no real
        station data exists publicly; parameters anchored to published
        Antarctic station studies — see §10).
      - 3D spatial station model with domain overlays.
      - Forecasting, what-if scenario simulation, cascading alerting.
      - Three operating modes: Connected, Degraded (digital shadow),
        Recovery (store-and-forward sync).
      - Operator console web app + optional AR annotation layer.
    OUT OF SCOPE (v1):
      - Real hardware integration, closed-loop control of physical assets,
        mobile native apps, Hindi i18n (stretch), multi-tenant SaaS.

1.3 Definitions
      Digital Twin: virtual model coupled to live/simulated state via
      predictive relationships — NOT a 3D dashboard.
      Digital Shadow: read-only local copy that continues during link outage.
      SPU: Store Package Unit (expedition cargo unit).
      RUL: Remaining Useful Life. SOC/SOH: battery State of Charge/Health.
      Winter-over: the ~9-month isolation period with no resupply.

1.4 References
      - SIH26060 problem statement (sih.gov.in/sih2026PS)
      - ESA 4DAntarctica (polar digital twin precedent)
      - BAS PolarDT / IceNet / PolarRoute (precedents)
      - NREL REopt South Pole study (energy calibration anchor)
      - Brazilian Antarctic Station hybrid microgrid study, HOMER-validated
      - Spasova 2023, "Digital Twin and Polar Digital Space in Antarctica" (SPIE)
      - MoES Maitri II approval, Oct 2025 (₹2,000 cr, born-digital opportunity)

================================================================================
2. OVERALL DESCRIPTION
================================================================================

2.1 Product Perspective
    Standalone full-stack web platform. Edge node is simulated in-browser /
    via a service flag; production design anticipates a real edge appliance
    at each station syncing over a satellite link.

2.2 User Classes
      U1 Station Operations Controller (NCPOR, Goa) — primary; views, acts on alerts.
      U2 Expedition Logistics Planner — resupply manifests, SPU tracking.
      U3 Station Engineer (on-site crew) — work orders, equipment condition.
      U4 MoES Administrator — read-only oversight, compliance reports.

2.3 Operating Modes (MANDATORY, key differentiator)
      M1 Connected: live telemetry ingest, cloud sync, full dashboards.
      M2 Degraded: satellite link down; edge runs autonomously; twin degrades
         to digital shadow; local historian + local alerting continue; UI shows
         "DEGRADED — last sync <timestamp>".
      M3 Recovery: link restored; store-and-forward sync; conflict review UI;
         forensic replay of the outage period.

2.4 Constraints
      - Must run fully offline at hackathon venue (no internet dependency).
      - All data synthetic; every number traceable to a documented parameter
        or clearly labeled "assumption".
      - 36-hour build; team of 6.

2.5 Assumptions
      Station profiles (publicly documented): Maitri (~25 winter crew, Schirmacher
      Oasis), Bharati (~47 crew capacity, Larsemann Hills, wind+solar hybrid).
      One annual resupply vessel (Nov–Jan window).

================================================================================
3. SYSTEM ARCHITECTURE
================================================================================

Layered, modular, federated:

  [ASSET LAYER]      buildings, gensets, PV/wind, batteries, fuel tanks,
                     stores, vehicles, sensors — described in Asset Registry
  [TELEMETRY LAYER]  Synthetic sensor emitters → MQTT broker → ingest service
                     → TimescaleDB (historian) + Redis (live state)
  [MODEL LAYER]      Domain simulators (energy, thermal, depletion, SHM,
                     battery SOC/SOH) + coupling engine
  [ANALYTICS LAYER]  Forecasting, anomaly detection, RUL, scenario engine
  [DECISION LAYER]   Alerting, work orders, dashboards, 3D twin, reports
  [EDGE/CLOUD SYNC]  Sync manager: Connected / Degraded / Recovery modes

================================================================================
4. TECH STACK (FIXED — do not substitute without team lead approval)
================================================================================

  Frontend      React 18 + TypeScript, Vite
  3D            Three.js (react-three-fiber), station models as GLTF
  Charts        Recharts / Plotly
  Backend API   Python 3.11, FastAPI, Pydantic v2, Uvicorn
  Simulators    Python (NumPy) — deterministic, seeded RNG for reproducibility
  Time-series   TimescaleDB (Postgres 16 extension) + Redis 7
  Messaging     MQTT via Eclipse Mosquitto (telemetry bus abstraction)
  Forecasting   Prophet (or sktime) + simple LSTM (PyTorch) for load/fuel
  Anomaly det.  Isolation Forest (scikit-learn) on telemetry windows
  Auth          JWT (python-jose), bcrypt, role-based access (4 roles, §2.2)
  ORM/Migrations SQLAlchemy 2 + Alembic
  Deployment    Docker Compose (single-command `docker compose up`)
  E2E demo      Playwright script for the judge demo path

================================================================================
5. FUNCTIONAL REQUIREMENTS
================================================================================
Priority: M = Must (MVP), S = Should, C = Could.

--- Module A: Asset Registry & Common Data Model ---
FR-A1 [M] CRUD for Station → Zone → Asset hierarchy (station, building,
        generator, PV array, battery bank, fuel tank, store, vehicle, sensor).
FR-A2 [M] Common asset registry schema: id, type, station_id, zone,
        install_date, criticality (1–5), specs (JSONB), telemetry_channel.
FR-A3 [M] Shared event/time model: every reading = (asset_id, metric,
        value, unit, ts, quality_flag, provenance: simulated|assumption|derived).
FR-A4 [M] Provenance field enforced on all stored values (honesty requirement).
FR-A5 [S] Asset registry export/import as JSON seed files per station.

--- Module B: Synthetic Telemetry Engine ---
FR-B1 [M] Seeded, deterministic sensor emitters publishing to MQTT at
        configurable intervals (env 30s, energy 10s, structural 60s).
FR-B2 [M] Environment simulator: Antarctic diurnal/seasonal temperature,
        wind speed/direction, irradiance curves (polar day/night cycle),
        with stochastic weather events (katabatic wind storms).
FR-B3 [M] Energy simulator: diesel gensets (duty/standby/emergency per
        Brazilian-station topology), PV/wind output from environment,
        battery SOC/SOH with cold-temperature derating.
FR-B4 [M] Consumables simulator: fuel, water, food, medical, spares —
        depletion driven by crew size + heating load + equipment state.
FR-B5 [M] Equipment degradation: wear model per critical asset; failures
        injectable on demand (demo scenarios) and randomly (rare).
FR-B6 [M] All simulators parameterized from a single `station_profile.yaml`
        per station; parameters cite their source (see §10).
FR-B7 [S] "Fault injection" control panel (UI button or API) to trigger
        generator failure, storm, delayed resupply, sensor drift.

--- Module C: Energy Twin ---
FR-C1 [M] Live microgrid state: generation mix, load, SOC, fuel burn rate.
FR-C2 [M] Thermal-load coupling: heating demand = f(outside temp, wind,
        building envelope); heating draws fuel.
FR-C3 [M] Fuel-exhaustion forecaster: project fuel exhaustion date vs.
        next resupply window; emit alert when projection crosses window.
FR-C4 [M] Dispatch recommendations engine (rule-based): load-shedding
        priority list, genset start/stop suggestions, battery charge windows.
FR-C5 [S] Day-ahead load & renewable forecast using Prophet on simulated
        history.
FR-C6 [C] Reinforcement-learning dispatcher (DeepTwin-style) — stretch only.

--- Module D: Infrastructure Twin ---
FR-D1 [M] Structural health indicators per building: envelope stress,
        roof snow/drift load, HVAC efficiency trend.
FR-D2 [M] Equipment RUL estimation (hybrid: physics wear model + anomaly
        score), per critical asset.
FR-D3 [M] Maintenance work-order workflow: alert → work order → status
        (open/in-progress/closed) → asset history log.
FR-D4 [S] AR annotation: attach manual/images to a 3D asset for remote
        expert assistance (web-based anchor, phone optional).

--- Module E: Logistics Twin ---
FR-E1 [M] Inventory ledger: all consumables with qty, unit, reorder
        threshold, lead time, last resupply date.
FR-E2 [M] Depletion forecast per SKU class vs. crew size & season.
FR-E3 [M] Resupply planner: given vessel window + capacity, compute
        recommended manifest (fuel, food, spares ranked by criticality).
FR-E4 [M] Scenario: "resupply delayed by N days" → recomputed margins +
        airlift shortlist (items below safety floor).
FR-E5 [S] SPU chain-of-custody: crates tracked statuses
        (docked→shipped→station→unpacked).

--- Module F: Environmental & Situational Awareness ---
FR-F1 [M] Met dashboard: temp, wind, pressure, irradiance, storm flags.
FR-F2 [M] Derived operational risk indicators: winter-over risk index =
        composite(fuel margin days, food days, medical days, power
        redundancy, storm exposure) — score 0–100 with explainable
        factor breakdown.
FR-F3 [M] Environmental compliance log: waste volumes, diesel spilled
        (0 target), CO₂ emissions estimate — exportable report.
FR-F4 [S] Sea-ice/resupply weather window simulator (probability-of-
        access curve across the season).

--- Module G: Coupling Engine & Alerting ---
FR-G1 [M] Central coupling engine subscribes to domain state and computes
        cross-domain effects: environment→thermal→fuel→logistics.
FR-G2 [M] Cascading alert engine: severity levels (info/warning/critical/
        emergency), each alert = {trigger rule, affected assets, recommended
        action, expiry}.
FR-G3 [M] The signature demo alert: temperature drop → heating load ↑ →
        fuel burn ↑ → exhaustion date crosses resupply window → CRITICAL
        alert with recommended actions.
FR-G4 [M] Alert feed UI with acknowledge/resolve workflow.
FR-G5 [S] What-if scenario replay: run scenario on a time-accelerated
        simulation clock (1 sim-day = 60s), show twin evolving.

--- Module H: 3D Spatial Twin & Operator Console ---
FR-H1 [M] 3D station model (GLTF, simplified from public layout) with
        selectable assets; clicking an asset opens its live state panel.
FR-H2 [M] Color-coded overlays per domain: energy (green→red load),
        fuel level, building health, temperature field.
FR-H3 [M] Main dashboard: station selector (Maitri/Bharati), winter-over
        risk index, fuel gauge with exhaustion date, active alerts,
        energy mix, top-5 depleting items.
FR-H4 [M] Operating-mode indicator (Connected/Degraded/Recovery) always
        visible in header; manual mode toggle for demo.
FR-H5 [S] Season replay: time-lapse scrubber over stored sim history.

--- Module I: Edge/Cloud Sync (Degraded-Link Operation) ---
FR-I1 [M] Sync manager service with the three modes (M1/M2/M3).
FR-I2 [M] Degraded mode: ingest + historian + alerting continue locally;
        cloud UI shows shadow state with staleness timestamp.
FR-I3 [M] Recovery: buffered events replay; conflict = last-writer-wins
        with conflict log UI.
FR-I4 [S] Simulated bandwidth throttle (e.g., 2.4 kbps Iridium-class) to
        demonstrate compressed-summary sync.

--- Module J: Security & Governance ---
FR-J1 [M] JWT auth, bcrypt, 4 roles (§2.2) with role-based route guards.
FR-J2 [M] Telemetry integrity: HMAC signature on simulated command
        channel; audit log of all alert acknowledgements and work orders.
FR-J3 [S] Offline-governance doc page (cyber procedures during link loss).

--- Module K: Reports & Exports ---
FR-K1 [M] One-page station health PDF (risk index, fuel, top alerts,
        compliance status) — the "morning brief" for MoES.
FR-K2 [S] Antarctic Treaty environmental report export (CSV/PDF).

================================================================================
6. NON-FUNCTIONAL REQUIREMENTS
================================================================================

NFR-1 [M] Cold start to working demo in < 5 min via `docker compose up`.
NFR-2 [M] UI p95 response < 500 ms on localhost.
NFR-3 [M] Deterministic demos: all seeded; scenario buttons produce the
          same result every run (rehearsable).
NFR-4 [M] Runs 100% offline (no external API calls at runtime).
NFR-5 [M] Sim clock supports acceleration up to 1 sim-day = 60 s without
          numeric instability.
NFR-6 [S] Architecture must document how real NCPOR telemetry would attach
          (adapter interface), without implementing it.
NFR-7 [M] Every UI number shows provenance tooltip (simulated/assumption).

================================================================================
7. DATA MODEL (core entities)
================================================================================

  Station(id, name, lat, lon, crew_size, profile_yaml_ref)
  Asset(id, station_id, type, zone, criticality, specs_jsonb, install_date)
  TelemetryReading(asset_id, metric, value, unit, ts, quality, provenance)
  Alert(id, station_id, rule_id, severity, message, recommended_action,
        created_ts, ack_by, status)
  WorkOrder(id, asset_id, alert_id, title, status, created_ts, closed_ts)
  InventoryItem(id, station_id, sku_class, qty, unit, reorder_threshold,
        lead_time_days, last_resupply_ts)
  ResupplyWindow(id, station_id, opens, closes, vessel_capacity_m3)
  ScenarioRun(id, user_id, scenario_type, params_jsonb, started_ts, result_jsonb)
  User(id, username, role, password_hash)

================================================================================
8. SYNTHETIC DATA CALIBRATION (anchors — cite in UI/pitch)
================================================================================

  ENERGY:  3×240 kVA gensets (duty/standby/emergency); CHP heat recovery
           ~40% of exhaust; wind ~970 L diesel saved per kWp/yr; mean load
           ~117 kW; HOMER-validated within +1.8% deviation
           [Brazilian Antarctic Station hybrid study].
  RENEWABLES CASE: PV+wind+battery → up to 96% fuel savings, 2–4 yr payback
           at 170 kW load [NREL REopt South Pole study].
  STATIONS: Maitri ~25 winter crew; Bharati ~47 capacity, existing wind+solar
           hybrid; one annual resupply window (Nov–Jan).
  ENVIRONMENT: Schirmacher Oasis & Larsemann Hills seasonal temp curves;
           polar day/night irradiance; katabatic storm events.
  Every parameter not from the above MUST be flagged provenance=assumption.

================================================================================
9. DEMO REQUIREMENTS (judge path — must work flawlessly)
================================================================================

  DEMO-A (signature, 90s): From dashboard, toggle "polar storm" fault
    injection → watch temperature drop → heating load spike → fuel curve
    steepen → exhaustion date crosses resupply window → CRITICAL alert
    appears with recommended actions → open one-click work order.
  DEMO-B (resupply, 60s): Trigger "resupply delayed 21 days" scenario →
    logistics twin recomputes margins → airlift shortlist shown → updated
    manifest suggestion.
  DEMO-C (degraded link, 45s): Toggle Degraded mode → satellite link
    indicator red, "digital shadow" banner, edge alerting continues →
    toggle Recovery → sync + conflict review screen.
  DEMO-D (3D, 30s): Fly through station, click genset → live state panel,
    RUL, provenance tooltip.
  E2E: Playwright script automating DEMO-A for backup.

================================================================================
10. DELIVERY PLAN (36-hour hackathon)
================================================================================

  H0–4    Repo, docker-compose, DB, MQTT, seed profiles, auth skeleton.
  H4–12   Simulators (B1–B6) + historian + energy twin core (C1–C3).
  H12–18  Coupling engine, alerting (G1–G4), logistics twin (E1–E4),
          infrastructure RUL (D1–D3).
  H18–26  React console: dashboard, 3D model, alert feed, mode toggle.
  H26–31  Sync manager (I1–I4), risk index (F2), scenario replay (G5).
  H31–34  Reports (K1), provenance tooltips, NFR polish.
  H34–36  Demo rehearsal, Playwright E2E, pitch slide screenshots.

  Team split (6): 2 backend/sim, 2 frontend/3D, 1 data-science
  (forecast/anomaly), 1 integration+docs+pitch.

================================================================================
11. ACCEPTANCE CRITERIA (definition of done for MVP)
================================================================================

  [ ] docker compose up → demo ready < 5 min, fully offline.
  [ ] DEMO-A, B, C, D execute end-to-end without manual DB edits.
  [ ] Every value in UI carries provenance tooltip.
  [ ] All FR-[M] items implemented; ≥ 50% of FR-[S] items.
  [ ] Winter-over risk index updates live and is explainable (factor drill-down).
  [ ] Code seeded/deterministic; two consecutive runs identical.
  [ ] README: architecture diagram, how-to-run, synthetic-data citations.

================================================================================
12. OPEN ITEMS / DECISIONS
================================================================================

  D1: Station GLTF models — build simplified geometry in Blender (2–3 h)
      vs. procedural Three.js boxes. Default: procedural + one hero building
      modeled.
  D2: Prophet vs. LSTM for load forecast — default Prophet (faster to
      integrate); LSTM stretch.
  D3: Scenario time acceleration factor — default 60×, configurable.
  D4: Hindi i18n — out of MVP.

================================================================================
13. EXTERNAL INTERFACE REQUIREMENTS
================================================================================

13.1 User Interfaces
      - Web-based Dashboard: Responsive React-based UI, optimized for 1080p desktop 
        screens (typical for operator control rooms).
      - Dark Mode Default: To reduce eye strain in 24/7 operator environments.
      - 3D Digital Twin Viewer: Interactive WebGL-based visualization embedded directly 
        into the main dashboard, supporting pan, zoom, and asset selection.

13.2 Hardware Interfaces
      - Edge Hardware (Simulated): For v1, the edge appliance is simulated via Docker 
        containers. Future production deployment targets ruggedized edge servers 
        (e.g., fanless industrial IoT gateways capable of sub-zero operation).
      - Sensors (Simulated): Emulated Modbus/TCP and MQTT payloads mirroring industrial 
        PLCs, flow meters, and weather stations.

13.3 Software Interfaces
      - Database Interoperability: TimescaleDB for time-series metrics, allowing direct 
        SQL-based querying for external BI tools if needed.
      - External APIs (Placeholder): Architecture must define webhooks/REST endpoints for 
        potential future integration with MoES central data repositories or the 
        Indian National Centre for Ocean Information Services (INCOIS).

13.4 Communication Interfaces
      - MQTT Protocol: The primary nervous system for telemetry, chosen for its low 
        bandwidth overhead and QoS support (crucial for satellite links).
      - WebSocket: Real-time UI updates from the backend FastAPI server.
      - Intermittent Satellite Link Simulation: Network degradation simulated locally via 
        `tc` (Traffic Control) or application-layer throttling (2.4 kbps to 1 Mbps).

================================================================================
14. SECURITY AND COMPLIANCE
================================================================================

14.1 Authentication and Authorization
      - Role-Based Access Control (RBAC): Strict enforcement across endpoints.
      - Token Expiry: Short-lived JWTs (15 minutes) with refresh tokens.

14.2 Data Protection
      - At-Rest: PostgreSQL data volumes encrypted at rest in production.
      - In-Transit: TLS 1.3 enforced on all API and WebSocket endpoints (simulated in 
        hackathon using self-signed certs).

14.3 Compliance
      - Audit Logging: All system state changes, configuration updates, and alert 
        acknowledgments must be logged immutably.
      - Antarctic Treaty Alignment: Features specific to environmental reporting (Module F) 
        must support exporting formats suitable for the Committee for Environmental 
        Protection (CEP).

================================================================================
15. RISKS AND MITIGATIONS (HACKATHON CONTEXT)
================================================================================

  R1: 3D Model Rendering Performance
      - Impact: High (judges care about UI responsiveness).
      - Mitigation: Keep GLTF models extremely low-poly. Strip all internal geometry 
        not visible from the outside. Defer to procedural geometry if Blender modeling 
        takes > 3 hours.
  R2: TimescaleDB/Redis Memory Overhead on Docker
      - Impact: Medium (could crash local developer machines).
      - Mitigation: Enforce strict retention policies on telemetry data during the 
        demo (e.g., flush historical data older than 2 simulation years).
  R3: Determinism in Simulators
      - Impact: High (live demos failing due to RNG variance).
      - Mitigation: Use fixed random seeds for all NumPy/Prophet processes. Test the 
        golden path (DEMO-A) repeatedly to ensure identical outcomes.

================================================================================
16. GLOSSARY & ACRONYMS
================================================================================

  - AR: Augmented Reality
  - CEP: Committee for Environmental Protection (Antarctic Treaty)
  - INCOIS: Indian National Centre for Ocean Information Services
  - MoES: Ministry of Earth Sciences
  - NCPOR: National Centre for Polar and Ocean Research
  - RUL: Remaining Useful Life
  - SOC / SOH: State of Charge / State of Health (Battery metrics)
  - SPU: Store Package Unit
  - Twin vs. Shadow: Twin has two-way coupling (or predictive capabilities); Shadow is a 
    one-way read-only reflection.
