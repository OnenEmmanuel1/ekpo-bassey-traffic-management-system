# JunctionAI (ITCS)
### Intelligent Traffic Control System for Ekpo-Abasi Junction, Calabar South LGA, Cross River State

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.19-000000?style=flat&logo=express)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql)](https://mysql.com)
[![EJS](https://img.shields.io/badge/Templates-EJS-B4CA65?style=flat)](https://ejs.co)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docker.com)

---

## 1. Executive Summary & Geographic Context

**JunctionAI** is a production-grade, full-stack Intelligent Traffic Control System (ITCS) developed for **Ekpo-Abasi Junction**, situated in **Calabar South Local Government Area, Cross River State, Nigeria**.

Ekpo-Abasi Junction is a vital, high-density traffic nexus connecting:
- **Approach 1 (Northbound)**: Ekpo-Abasi Street (Approach from the main entrance of Cross River University of Technology - UNICROSS / CRUTECH).
- **Approach 2 (Southbound)**: Ekpo-Abasi Street (Approach from the Calabar South commercial district and Watt Market corridor).
- **Approach 3 (Eastbound)**: Mayne Avenue Link (Approach from the Anantigha Coastal Bypass).
- **Approach 4 (Westbound)**: Saintaggers / Target Street Link (Approach from Mary Slessor Avenue).

Traditional traffic control in this corridor relied on static, fixed-time signal switching or manual traffic warden intervention. This created severe structural inefficiencies, notably **Empty Lane Syndrome** (where a signal remains green for an empty approach while adjacent congested legs back up), a total **Absence of Emergency Vehicle Priority** (ambulances to General Hospital Calabar or UNICROSS Medical Center stuck in gridlock), and **Poor Historical Data Collection**.

JunctionAI resolves these challenges through a unified real-time adaptive timing engine, an emergency preemption state machine, a dedicated pedestrian safety coordinator, and a centralized audit telemetry system.

---

## 2. Sensor Simulation Scope Note

> [!NOTE]
> **Simulated Sensor Feed & Downstream Reality**
> Per the modern web-stack architecture of this implementation:
> - Physical hardware components (such as inductive loops, IR breaks, and ultrasonic transceivers) are replaced with an internal, configurable **per-lane simulated vehicle density generator** in `engine/itcsEngine.js`.
> - Every sensor reading is explicitly tagged in the database schema as `is_simulated = TRUE`.
> - **Crucially, all downstream subsystems (queue estimation, dynamic green phase duration calculations, emergency vehicle preemption transitions, pedestrian walk insertions, and telemetry broadcasting) are genuine, fully implemented algorithms operating directly against the continuous simulated sensor stream.**

---

## 3. Core Algorithms & Architecture

### 3.1 Adaptive Signal Timing & "Empty Lane Syndrome" Elimination
The system evaluates real-time vehicle density $D_i \in [0, 100]$ across all approach lanes. Dynamic green phase duration $T_{\text{green}}$ is computed continuously using weighted proportional demand:

$$T_{\text{green}, i} = \text{clamp}\left( T_{\min} + (T_{\max} - T_{\min}) \times \left( \left(\frac{D_i}{100}\right)^{\frac{1}{W}} \times 0.7 + \left(\frac{D_i}{\sum D_j} \times \frac{N}{2}\right) \times 0.3 \right), \; T_{\min}, \; T_{\max} \right)$$

- When an approach is empty or free-flowing ($D_i \le 5\%$), the engine immediately truncates green duration to $T_{\min}$ (e.g., $10\text{s}$), rapidly cycling green priority to waiting traffic on competing legs.
- During peak congestion ($D_i \ge 75\%$), green duration dynamically expands up to $T_{\max}$ (e.g., $60\text{s}$) to maximize saturation flow discharge capacity.

### 3.2 Emergency Vehicle Preemption State Machine
When an optical transponder or emergency vehicle flag is detected (or an authorized administrator dispatches priority from the console):
1. Conflicting green lanes receive an immediate $3\text{s}$ **Yellow Clearance** phase.
2. A $1\text{s}$ **All-Red Transition Buffer** is enforced across the intersection to clear the box.
3. The emergency approach lane is locked to **GREEN** with visual emergency strobe indicators on the console.
4. Green priority is held until the vehicle clears or the maximum preemption limit ($T_{\text{preempt\_max}} = 30\text{s}$) is reached.
5. A comprehensive incident record is persisted into `preemption_events`.
6. The engine safely returns to the adaptive cycle, prioritizing the highest-density waiting lane.

### 3.3 Pedestrian Crossing Safety Module
When a pedestrian push-button demand is registered:
1. The request enters the queue with a guaranteed maximum bounded wait time ($T_{\text{ped\_wait\_max}} \le 45\text{s}$).
2. Upon completion of the active vehicular clearance phase, all approach signals are locked to **ALL-RED**.
3. Pedestrian signals switch to **WALK** with an active countdown ($15\text{s}$).
4. The phase is logged to `pedestrian_events` for municipal safety audits.

---

## 4. UI Design System (Flat & Modern — Strictly NO Gradients)

The administrative control room is built with a custom **Flat Design System** (`itcs-*` CSS prefix):
- **Solid Color Tokens Only**: No linear or radial gradients anywhere.
- **Color Palette**: Slate 900 (`#0b1120`), Slate 800 (`#131d33`), Traffic Red (`#ef4444`), Traffic Amber (`#f59e0b`), Traffic Green (`#10b981`), Emergency Scarlet (`#dc2626`), Pedestrian Cyan (`#06b6d4`).
- **Typography**: Inter (Google Fonts) with JetBrains Mono for telemetry tickers and countdown clocks.
- **Interactive Visualizer**: 4-way topological map of Ekpo-Abasi Junction with 3-aspect animated signal heads, live queue meters, density heat bars, and active phase countdown overlays.

---

## 5. System Architecture & Directory Tree

```
├── config/
│   ├── db.js                 # MySQL pool with parameterized queries & fallback
│   └── session.js            # express-session configuration
├── database/
│   ├── schema.sql            # Normalized tables: admins, lanes, sensor_readings, signal_states, preemption_events, pedestrian_events, config
│   ├── seed.sql              # Default admin, 4 junction lanes, default parameters, 24h burst historical data
│   └── migrate.js            # Migration CLI runner
├── engine/
│   ├── itcsEngine.js         # Master simulation generator & adaptive cycle state machine
│   └── adaptiveAlgorithm.js  # Dynamic green duration & throughput math
├── middleware/
│   ├── auth.js               # Admin authentication guard
│   └── errorHandler.js       # Centralized error handling
├── routes/
│   ├── api/
│   │   ├── junction.js       # Telemetry, emergency dispatch & density overrides
│   │   ├── config.js         # Parameter read/write endpoints
│   │   ├── analytics.js      # Time-series metrics & queue calculations
│   │   └── reports.js        # Historical query logs & CSV export
│   └── pages/
│       ├── auth.js           # Admin login / logout
│       ├── dashboard.js      # Master live control room
│       ├── analytics.js      # Traffic charts & Level of Service analysis
│       ├── preemption.js     # Emergency dispatch center & logs
│       ├── pedestrian.js     # Pedestrian crosswalk management
│       ├── configuration.js  # Timing bounds & weighting factor panel
│       └── reports.js        # Audit reports & CSV downloader
├── views/
│   ├── partials/ (header.ejs, navbar.ejs, sidebar.ejs, footer.ejs)
│   └── pages/    (login.ejs, dashboard.ejs, analytics.ejs, preemption.ejs, pedestrian.ejs, configuration.ejs, reports.ejs, error.ejs)
├── public/
│   ├── css/      (itcs-variables.css, itcs-base.css, itcs-components.css, itcs-intersection.css)
│   └── js/       (itcs-realtime.js, itcs-controls.js, itcs-charts.js, itcs-config.js)
├── Dockerfile                # Production Node.js container
├── docker-compose.yml        # Multi-service stack (Node.js + MySQL 8.0)
├── .env.example              # Environment variables template
├── server.js                 # Application entry point
└── README.md                 # System documentation
```

---

## 6. Quick Start & Setup Instructions

### Option A: Run Locally via Node.js

1. **Clone/Navigate to Project**:
   ```bash
   cd "c:/Users/USER/Desktop/project/nodejs  back-end/EJS/school project sw/EKPO BASSEY SOFTWARE"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env` (pre-configured with defaults):
   ```bash
   cp .env.example .env
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```
   *The server starts on `http://localhost:3000`. If MySQL is not running locally, the built-in high-performance fallback engine activates automatically.*

---

### Option B: Run via Docker Compose (Full Stack with MySQL 8.0)

```bash
docker-compose up --build
```
- App container: `http://localhost:3000`
- MySQL container: Port `3306` with database `junction_ai_db` automatically initialized and seeded.

---

## 7. Default Administrator Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Senior Traffic Engineer** | `admin@junctionai.cr.gov.ng` | `Admin@EkpoAbasi2026!` |

---

## 8. JSON API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/junction/live-state` | Real-time signal phases, countdowns & density metrics | No |
| `POST` | `/api/junction/emergency-override` | Trigger priority green clearance for a lane | Yes |
| `POST` | `/api/junction/emergency-clear` | Release active emergency override | Yes |
| `POST` | `/api/junction/pedestrian-request` | Submit pedestrian crossing push-button demand | No |
| `POST` | `/api/junction/density-override` | Inject simulated lane density for testing scenarios | Yes |
| `GET` | `/api/config` | Retrieve system timing parameters | Yes |
| `PUT` | `/api/config` | Update system timing parameters & hot-reload engine | Yes |
| `GET` | `/api/analytics/historical` | Retrieve 120 recent historical sensor time-series | Yes |
| `GET` | `/api/reports/export/csv?type=traffic` | Stream CSV export of traffic density readings | Yes |
| `GET` | `/api/reports/export/csv?type=preemption` | Stream CSV export of emergency incidents | Yes |
| `GET` | `/api/reports/export/csv?type=pedestrian` | Stream CSV export of pedestrian phases | Yes |
