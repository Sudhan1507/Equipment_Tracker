CREATE DATABASE IF NOT EXISTS equipment_checkout;
USE equipment_checkout;

CREATE TABLE user_master (
    id CHAR(36) PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_type ENUM('TECHNICIAN', 'SUPERVISOR') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE equipment_master (
    id CHAR(36) PRIMARY KEY,
    equipment_name VARCHAR(100) NOT NULL,
    total_quantity INT UNSIGNED NOT NULL,
    available_quantity INT UNSIGNED NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    created_by CHAR(36) NOT NULL,
    updated_by CHAR(36) NULL,

    CONSTRAINT chk_equipment_quantity
        CHECK (
            total_quantity > 0
            AND available_quantity <= total_quantity
        ),

    CONSTRAINT fk_equipment_created_by
        FOREIGN KEY (created_by)
        REFERENCES user_master(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_equipment_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES user_master(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE equipment_requests (
    id CHAR(36) PRIMARY KEY,
    technician_id CHAR(36) NOT NULL,
    equipment_id CHAR(36) NOT NULL,

    requested_quantity INT UNSIGNED NOT NULL,
    approved_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    returned_quantity INT UNSIGNED NOT NULL DEFAULT 0,

    req_status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'RETURNED'
    ) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_request_technician
        FOREIGN KEY (technician_id)
        REFERENCES user_master(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_request_equipment
        FOREIGN KEY (equipment_id)
        REFERENCES equipment_master(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_request_creator
        FOREIGN KEY (created_by)
        REFERENCES user_master(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_requested_quantity
        CHECK (requested_quantity > 0),

    CONSTRAINT chk_approved_quantity
        CHECK (approved_quantity <= requested_quantity),

    CONSTRAINT chk_returned_quantity
        CHECK (returned_quantity <= approved_quantity)
) ENGINE=InnoDB;