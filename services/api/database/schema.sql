CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(40) NOT NULL,
    display_name VARCHAR(40) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    auth_version INT UNSIGNED NOT NULL DEFAULT 1,
    virtual_balance BIGINT NOT NULL DEFAULT 500000,
    opponent_balance BIGINT NOT NULL DEFAULT 500000,
    gostop_computer_a_balance BIGINT NOT NULL DEFAULT 500000,
    gostop_computer_b_balance BIGINT NOT NULL DEFAULT 500000,
    profile_image MEDIUMBLOB NULL,
    profile_image_content_type VARCHAR(32) NULL,
    profile_image_updated_at DATETIME(6) NULL,
    settings_json JSON NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_username_unique (username),
    KEY users_active_idx (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_saves (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    slot_key VARCHAR(32) NOT NULL DEFAULT 'matgo-main',
    game_uuid CHAR(36) NOT NULL,
    game_mode ENUM('matgo', 'gostop') NOT NULL DEFAULT 'matgo',
    status ENUM('active', 'completed', 'abandoned') NOT NULL DEFAULT 'active',
    state_version INT UNSIGNED NOT NULL DEFAULT 1,
    turn_number INT UNSIGNED NOT NULL DEFAULT 0,
    state_json JSON NOT NULL,
    device_id VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY game_saves_user_slot_unique (user_id, slot_key),
    KEY game_saves_user_status_idx (user_id, status, updated_at),
    CONSTRAINT game_saves_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    game_uuid CHAR(36) NOT NULL,
    game_mode ENUM('matgo', 'gostop') NOT NULL DEFAULT 'matgo',
    result ENUM('win', 'loss', 'draw', 'nagari') NOT NULL,
    final_score INT NOT NULL DEFAULT 0,
    settlement_amount BIGINT NOT NULL DEFAULT 0,
    balance_after BIGINT NOT NULL,
    opponent_balance_after BIGINT NOT NULL DEFAULT 500000,
    gostop_computer_a_balance_after BIGINT NOT NULL DEFAULT 500000,
    gostop_computer_b_balance_after BIGINT NOT NULL DEFAULT 500000,
    summary_json JSON NULL,
    played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY match_history_game_unique (user_id, game_uuid),
    KEY match_history_user_date_idx (user_id, played_at),
    CONSTRAINT match_history_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
