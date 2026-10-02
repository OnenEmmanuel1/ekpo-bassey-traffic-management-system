-- JunctionAI (ITCS) Seed Data
-- Location: Ekpo-Abasi Junction, Calabar South LGA, Cross River State

-- 1. Default Traffic Authority Administrator
-- Email: admin@junctionai.cr.gov.ng
-- Default Password: password123
-- Bcrypt Hash for "password123": $2a$10$MWd4QWF.mOshKy3mP4y9tu7ZjagCmqT1Fo5A1L0H1ozYGSCpNYU.a
INSERT INTO admins (id, name, email, password_hash, role)
VALUES (
    1,
    'Engr. Bassey E. Okon',
    'admin@junctionai.cr.gov.ng',
    '$2a$10$MWd4QWF.mOshKy3mP4y9tu7ZjagCmqT1Fo5A1L0H1ozYGSCpNYU.a',
    'Senior Traffic Engineer'
) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash);

-- 2. Four Directional Approach Lanes at Ekpo-Abasi Junction
INSERT INTO lanes (id, code, name, direction, approach_description, is_active)
VALUES
    (1, 'L1_NB', 'Ekpo-Abasi Northbound', 'Northbound', 'Approach from UNICROSS / CRUTECH Main Gate', 1),
    (2, 'L2_SB', 'Ekpo-Abasi Southbound', 'Southbound', 'Approach from Calabar South Commercial Center / Watt Market Link', 1),
    (3, 'L3_EB', 'Mayne Avenue Eastbound', 'Eastbound', 'Approach from Anantigha / Coastal Bypass Link', 1),
    (4, 'L4_WB', 'Saintaggers Westbound', 'Westbound', 'Approach from Target / Mary Slessor Avenue', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name), approach_description=VALUES(approach_description);

-- 3. System Configuration Parameters
INSERT INTO config (config_key, config_value, description)
VALUES
    ('junction_name', 'Ekpo-Abasi Junction', 'Primary identifier for the target intersection'),
    ('junction_location', 'Calabar South LGA, Cross River State', 'Geographic municipality'),
    ('min_green_seconds', '10', 'Minimum green phase duration to clear minimum queue (s)'),
    ('max_green_seconds', '60', 'Maximum allowable green phase duration during peak congestion (s)'),
    ('yellow_seconds', '4', 'Safe clearance yellow phase duration (s)'),
    ('all_red_seconds', '2', 'All-red junction clearance buffer between conflicting phases (s)'),
    ('density_weight_factor', '1.5', 'Adaptive scaling exponent for density-to-duration computation'),
    ('emergency_max_duration', '30', 'Maximum hold time for emergency vehicle preemption (s)'),
    ('pedestrian_walk_duration', '15', 'Dedicated pedestrian crossing walk duration (s)'),
    ('pedestrian_max_wait_seconds', '45', 'Maximum queue wait time before inserting pedestrian phase (s)'),
    ('sim_sensor_interval_ms', '3000', 'Simulation tick interval for vehicle density generation (ms)'),
    ('sim_emergency_probability', '0.04', 'Probability threshold for stochastic emergency vehicle injection'),
    ('sim_pedestrian_probability', '0.07', 'Probability threshold for stochastic pedestrian crossing demand')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- 4. Initial Seeded Sensor Readings (Simulated Historical Baseline for Charts)
INSERT INTO sensor_readings (lane_id, vehicle_density, emergency_vehicle_flag, pedestrian_waiting_flag, is_simulated, recorded_at)
VALUES
    (1, 45, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 120 MINUTE)),
    (2, 65, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 120 MINUTE)),
    (3, 30, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 120 MINUTE)),
    (4, 25, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 120 MINUTE)),

    (1, 55, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
    (2, 78, 0, 1, 1, DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
    (3, 40, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
    (4, 32, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 90 MINUTE)),

    (1, 72, 1, 0, 1, DATE_SUB(NOW(), INTERVAL 60 MINUTE)),
    (2, 85, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 60 MINUTE)),
    (3, 48, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 60 MINUTE)),
    (4, 42, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 60 MINUTE)),

    (1, 60, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
    (2, 62, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
    (3, 35, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
    (4, 28, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),

    (1, 48, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
    (2, 52, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
    (3, 30, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
    (4, 20, 0, 0, 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- 5. Seeded Historical Preemption Events
INSERT INTO preemption_events (lane_id, triggered_by, status, triggered_at, ended_at, duration_seconds, notes)
VALUES
    (1, 'Simulated Sensor Detection (Ambulance - UNICROSS Health Center Link)', 'completed', DATE_SUB(NOW(), INTERVAL 60 MINUTE), DATE_SUB(NOW(), INTERVAL 59 MINUTE), 24, 'Rapid green clearance granted for medical emergency heading towards General Hospital Calabar'),
    (2, 'Manual Override: Traffic Command Dispatch', 'completed', DATE_SUB(NOW(), INTERVAL 180 MINUTE), DATE_SUB(NOW(), INTERVAL 179 MINUTE), 28, 'Police convoy security clearance for VIP transit along Ekpo-Abasi corridor');

-- 6. Seeded Historical Pedestrian Events
INSERT INTO pedestrian_events (requested_at, phase_started_at, phase_ended_at, duration_seconds, notes)
VALUES
    (DATE_SUB(NOW(), INTERVAL 90 MINUTE), DATE_SUB(NOW(), INTERVAL 89 MINUTE), DATE_SUB(NOW(), INTERVAL 89 MINUTE), 15, 'UNICROSS student group crosswalk phase executed'),
    (DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_SUB(NOW(), INTERVAL 44 MINUTE), DATE_SUB(NOW(), INTERVAL 44 MINUTE), 15, 'School children safe crossing wave executed');
