-- JunctionAI (ITCS) Database Schema
-- Location: Ekpo-Abasi Junction, Calabar South LGA, Cross River State
-- Normalized tables with constraints & indexes for high performance parameterized queries

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Traffic Administrator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lanes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    direction VARCHAR(50) NOT NULL,
    approach_description VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lane_id INT NOT NULL,
    vehicle_density INT NOT NULL, -- Density index (0 to 100)
    emergency_vehicle_flag BOOLEAN DEFAULT FALSE,
    pedestrian_waiting_flag BOOLEAN DEFAULT FALSE,
    is_simulated BOOLEAN DEFAULT TRUE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lane_id) REFERENCES lanes(id) ON DELETE CASCADE,
    INDEX idx_lane_time (lane_id, recorded_at),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS signal_states (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lane_id INT NOT NULL,
    phase ENUM('red', 'yellow', 'green') NOT NULL,
    phase_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phase_duration_seconds INT NOT NULL,
    cycle_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lane_id) REFERENCES lanes(id) ON DELETE CASCADE,
    INDEX idx_cycle (cycle_id),
    INDEX idx_phase_time (phase_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS preemption_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lane_id INT NOT NULL,
    triggered_by VARCHAR(100) DEFAULT 'Simulated Sensor Detection',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'completed',
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    duration_seconds INT DEFAULT 0,
    notes TEXT NULL,
    FOREIGN KEY (lane_id) REFERENCES lanes(id) ON DELETE CASCADE,
    INDEX idx_preempt_time (triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedestrian_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phase_started_at TIMESTAMP NULL,
    phase_ended_at TIMESTAMP NULL,
    duration_seconds INT DEFAULT 15,
    notes VARCHAR(255) NULL,
    INDEX idx_ped_time (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(80) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
