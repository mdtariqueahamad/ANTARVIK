# 🏔️ ANTARVIK — Digital Twin for Indian Antarctic Stations

> **ANTARVIK** (अंतर्विक) — Real-time Digital Twin platform for monitoring and managing India's Antarctic research stations **Maitri** and **Bharati**, built for Smart India Hackathon (SIH).

[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](backend/)
[![React](https://img.shields.io/badge/Frontend-React+Vite-61DAFB?logo=react)](frontend/)
[![TimescaleDB](https://img.shields.io/badge/DB-TimescaleDB-FDB515?logo=postgresql)](https://www.timescale.com/)

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANTARVIK Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────────┐    ┌───────────────────┐    │
│   │ React +  │◄──►│  FastAPI      │◄──►│  TimescaleDB      │    │
│   │ Vite     │    │  Backend      │    │  (PostgreSQL 16)  │    │
│   │ :5173    │    │  :8000        │    │  :5432            │    │
│   └────┬─────┘    └──────┬───────┘    └───────────────────┘    │
│        │                 │                                      │
│        │    WebSocket    │    MQTT                              │
│        │                 ▼                                      │
│        │          ┌──────────────┐    ┌───────────────────┐    │
│        └─────────►│  Mosquitto   │    │  Redis 7          │    │
│                   │  MQTT Broker │    │  Cache + Pub/Sub  │    │
│                   │  :1883/:9001 │    │  :6379            │    │
│                   └──────────────┘    └───────────────────┘    │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              Synthetic Data Generators                   │  │
│   │  Weather │ Power │ Fuel │ Structural │ Comms │ Medical  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                   Nginx (Production)                     │  │
│   │              Reverse Proxy + Static Serve :80            │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer         | Technology                  | Purpose                                    |
|---------------|-----------------------------|--------------------------------------------|
| **Frontend**  | React 18 + Vite             | 3D visualization, dashboards, controls     |
| **3D Engine** | Three.js / React Three Fiber| Station 3D models, terrain rendering        |
| **Backend**   | FastAPI (Python 3.11)       | REST API, WebSocket, business logic         |
| **Database**  | TimescaleDB (PostgreSQL 16) | Time-series telemetry, hypertables          |
| **Cache**     | Redis 7                     | Session cache, real-time pub/sub            |
| **MQTT**      | Eclipse Mosquitto 2         | IoT telemetry bus, sensor data ingestion    |
| **Proxy**     | Nginx                       | Production reverse proxy, static serving    |
| **Container** | Docker Compose              | Orchestration, one-command deployment       |

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) v2+
- 4 GB RAM minimum (TimescaleDB + all services)

### Launch

```bash
# Clone and enter the project
cd ANTARVIK

# Start all services (builds on first run)
docker compose up --build

# Or run in background
docker compose up --build -d
```

### Access Points

| Service       | URL                          |
|---------------|------------------------------|
| **Frontend**  | http://localhost:5173         |
| **API Docs**  | http://localhost:8000/docs    |
| **API**       | http://localhost:8000/api     |
| **MQTT WS**   | ws://localhost:9001           |
| **MQTT TCP**  | tcp://localhost:1883          |
| **Database**  | postgresql://localhost:5432   |

### Stop

```bash
docker compose down          # Stop services
docker compose down -v       # Stop + remove volumes (fresh DB)
```

---

## 📁 Project Structure

```
ANTARVIK/
├── docker-compose.yml          # Service orchestration
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── nginx.conf                  # Production reverse proxy
├── README.md                   # This file
│
├── backend/                    # FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── config.py           # Settings & env loading
│       ├── models/             # SQLAlchemy / Pydantic models
│       │   ├── station.py      # Station, Module definitions
│       │   ├── telemetry.py    # Sensor readings (hypertable)
│       │   ├── alert.py        # Alert thresholds & events
│       │   └── user.py         # Authentication models
│       ├── api/                # Route handlers
│       │   ├── stations.py     # Station CRUD
│       │   ├── telemetry.py    # Telemetry ingest & query
│       │   ├── alerts.py       # Alert management
│       │   ├── simulation.py   # Scenario simulation
│       │   └── health.py       # Health check endpoint
│       ├── services/           # Business logic
│       │   ├── mqtt_client.py  # MQTT subscriber/publisher
│       │   ├── simulator.py    # Synthetic data generator
│       │   ├── analytics.py    # Time-series analytics
│       │   └── alert_engine.py # Threshold monitoring
│       └── db/                 # Database utilities
│           ├── session.py      # Async session factory
│           └── migrations/     # Alembic migrations
│
├── frontend/                   # React + Vite application
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/         # React components
│       │   ├── Dashboard/      # Overview panels
│       │   ├── Station3D/      # Three.js 3D station view
│       │   ├── Telemetry/      # Real-time charts
│       │   ├── Alerts/         # Alert management UI
│       │   └── Simulation/     # What-if scenario controls
│       ├── hooks/              # Custom React hooks
│       │   ├── useMQTT.ts      # MQTT WebSocket hook
│       │   └── useTelemetry.ts # Telemetry data hook
│       ├── services/           # API client layer
│       └── types/              # TypeScript definitions
│
└── mosquitto/                  # MQTT broker config
    └── config/
        └── mosquitto.conf
```

---

## 🔌 API Endpoints

### Stations
| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| GET    | `/api/stations`              | List all stations              |
| GET    | `/api/stations/{id}`         | Station details                |
| GET    | `/api/stations/{id}/modules` | Station modules & subsystems   |
| GET    | `/api/stations/{id}/status`  | Live operational status        |

### Telemetry
| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| POST   | `/api/telemetry/ingest`          | Ingest sensor reading          |
| GET    | `/api/telemetry/{station_id}`    | Query telemetry (time range)   |
| GET    | `/api/telemetry/latest/{station}`| Latest readings per sensor     |
| GET    | `/api/telemetry/aggregate`       | Aggregated stats (avg/min/max) |

### Alerts
| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| GET    | `/api/alerts`                | Active alerts                  |
| POST   | `/api/alerts/thresholds`     | Configure alert thresholds     |
| PUT    | `/api/alerts/{id}/acknowledge` | Acknowledge an alert         |
| GET    | `/api/alerts/history`        | Alert history log              |

### Simulation
| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| POST   | `/api/simulation/scenario`   | Run what-if scenario           |
| GET    | `/api/simulation/scenarios`  | List available scenarios       |
| POST   | `/api/simulation/blizzard`   | Trigger blizzard simulation    |
| POST   | `/api/simulation/power-fail` | Trigger power failure scenario |

### System
| Method | Endpoint          | Description           |
|--------|-------------------|-----------------------|
| GET    | `/api/health`     | Service health check  |
| POST   | `/api/auth/login` | JWT authentication    |
| GET    | `/docs`           | Swagger UI            |

---

## 🧊 MQTT Topic Structure

```
antarvik/
├── maitri/
│   ├── weather/          # Temperature, wind, pressure, humidity
│   ├── power/            # Generator output, solar, battery, load
│   ├── fuel/             # Tank levels, consumption rate
│   ├── structural/       # Vibration, tilt, snow load sensors
│   ├── comms/            # Satellite link quality, bandwidth
│   └── medical/          # Infirmary status, O2, temperature
├── bharati/
│   ├── weather/
│   ├── power/
│   ├── fuel/
│   ├── structural/
│   ├── comms/
│   └── medical/
└── alerts/               # Cross-station alert broadcasts
```

---

## 🎬 Demo Scenarios

### 1. 🌬️ Blizzard Event
Simulates a Category-3 Antarctic blizzard (wind > 120 km/h, visibility < 10m). Demonstrates:
- Real-time weather deterioration on dashboard
- Automatic alert escalation (Advisory → Warning → Emergency)
- Power system stress as generators increase load
- Structural snow-load monitoring crossing thresholds
- Communication degradation due to antenna icing

### 2. ⚡ Power System Failure
Simulates primary generator failure during winter darkness. Demonstrates:
- Automatic switchover to backup generator
- Battery reserve depletion curve
- Load-shedding priority cascade (non-essential → labs → living quarters)
- Fuel consumption recalculation
- Estimated time to critical on dashboard

### 3. 🔧 Predictive Maintenance
Shows degradation patterns leading to equipment failure. Demonstrates:
- Vibration anomaly detection in generator bearings
- Trend analysis with time-series queries
- Maintenance window recommendation
- Part replacement scheduling with supply chain lead times

### 4. 📡 Communication Blackout
Simulates satellite link failure during critical period. Demonstrates:
- Store-and-forward data buffering
- Priority message queuing
- Automatic reconnection and data sync
- Fallback communication pathways

---

## 📊 Synthetic Data Calibration Sources

The simulator generates realistic telemetry calibrated against published Antarctic data:

| Parameter         | Source                                    | Range                    |
|-------------------|-------------------------------------------|--------------------------|
| **Temperature**   | IMD Antarctic Reports, AWS Maitri records | -40°C to +5°C (seasonal) |
| **Wind Speed**    | NCPOR Maitri AWS data                     | 0–180 km/h (katabatic)   |
| **Pressure**      | ERA5 reanalysis, station barographs       | 940–1020 hPa             |
| **Solar Irradiance** | BSRN Neumayer (proxy), CERES satellite | 0–800 W/m² (summer)      |
| **Humidity**      | Radiosonde profiles, IGRA                 | 15–95% RH                |
| **Power Load**    | Published station energy audits           | 50–200 kW (seasonal)     |
| **Fuel Reserve**  | NCPOR logistics reports                   | 0–100% (annual resupply) |
| **Structure**     | ISO 4355 snow-load, JARE/ANARE reports    | 0–15 kPa snow load       |

**Key References:**
- NCPOR (National Centre for Polar & Ocean Research) annual expedition reports
- IMD (India Meteorological Department) Antarctic observation summaries
- SCAR (Scientific Committee on Antarctic Research) data portals
- ERA5 Climate Reanalysis (Copernicus/ECMWF)
- BSRN (Baseline Surface Radiation Network) archive

---

## 👥 Team Allocation Guide

| Role                  | Focus Area                                    | Key Deliverables                        |
|-----------------------|-----------------------------------------------|-----------------------------------------|
| **Lead / Architect**  | System design, integration, demo coordination | Architecture, docker-compose, API spec  |
| **Backend Dev 1**     | FastAPI routes, DB models, MQTT integration   | REST API, TimescaleDB hypertables       |
| **Backend Dev 2**     | Synthetic data engine, alert system           | Simulator, threshold engine, analytics  |
| **Frontend Dev 1**    | 3D visualization, Three.js station models     | 3D scene, camera controls, model loading|
| **Frontend Dev 2**    | Dashboard, charts, real-time data binding     | Recharts panels, MQTT hooks, alerts UI  |
| **DevOps / Testing**  | Docker, CI/CD, testing, demo script           | Compose setup, test suite, demo flow    |

### Parallel Workstreams
```
Week 1:  [Backend: DB + API]  ||  [Frontend: 3D + UI scaffold]  ||  [DevOps: Docker + MQTT]
Week 2:  [Backend: Simulator] ||  [Frontend: Dashboard + MQTT]  ||  [Integration Testing]
Week 3:  [Full Integration]   ||  [Demo Scenarios]              ||  [Polish + Documentation]
```

---

## 🔒 Security Notes

- Change `JWT_SECRET` in production (`.env`)
- Disable `allow_anonymous` in Mosquitto for production
- Use `nginx.conf` with TLS certificates for HTTPS
- Set strong `POSTGRES_PASSWORD`
- Frontend env vars (`VITE_*`) are bundled into the build—never put secrets there

---

## 📝 Development

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild a single service
docker compose build backend
docker compose up -d backend

# Access database
docker compose exec db psql -U antarvik -d antarvik

# Access Redis CLI
docker compose exec redis redis-cli

# Publish test MQTT message
docker compose exec mqtt mosquitto_pub -t "antarvik/maitri/weather" \
  -m '{"temperature": -25.3, "wind_speed": 45.2, "timestamp": "2024-01-15T10:30:00Z"}'
```

---

## 📄 License

Built for Smart India Hackathon (SIH). Internal use.

---

<p align="center">
  <strong>🇮🇳 ANTARVIK — Bridging India's Antarctic Presence with Digital Innovation</strong>
</p>
