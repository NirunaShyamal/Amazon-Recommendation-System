-- Local SQLite schema (auto-created by db.py / init_db.py)

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    categories TEXT,
    primary_category TEXT,
    content_text TEXT,
    image_url TEXT,
    created_at TEXT,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review_title TEXT,
    review_body TEXT,
    sentiment_score REAL,
    sentiment_positive_probability REAL,
    trust_score_calibrated REAL,
    time_weight REAL,
    effective_rating REAL,
    early_review_90d_flag REAL,
    suspicious_review_flag REAL,
    created_at TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS app_users (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    is_demo INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
