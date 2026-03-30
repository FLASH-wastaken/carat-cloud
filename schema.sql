-- Carat Cloud · D1 Database Schema
-- Run with: npm run db:migrate (local) or npm run db:migrate:remote (production)

CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL,
    company    TEXT,
    message    TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for quick lookup by email
CREATE INDEX IF NOT EXISTS idx_contacts_email    ON contacts    (email);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);
