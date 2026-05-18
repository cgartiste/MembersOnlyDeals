-- MembersOnlyDeals — Cloudflare D1 schema
-- Run: wrangler d1 execute DB --local --file=schema.sql
-- Deploy: wrangler d1 execute DB --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS pipesend_sponsors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  driver TEXT NOT NULL DEFAULT 'cake',
  api_base TEXT NOT NULL,
  api_key TEXT NOT NULL,
  affiliate_id TEXT NOT NULL DEFAULT '',
  tracking_link_template TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipesend_sponsor_offers (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL REFERENCES pipesend_sponsors(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  name TEXT,
  vertical TEXT,
  payout REAL,
  payout_display TEXT,
  status TEXT,
  html_creative TEXT,
  image_url TEXT,
  slug TEXT,
  raw TEXT,
  tracking_link TEXT,
  email_html TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(sponsor_id, offer_id)
);

CREATE TABLE IF NOT EXISTS pipesend_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  source TEXT,
  motivation TEXT,
  country TEXT,
  gender TEXT,
  interest TEXT,
  level TEXT,
  current_sell_link TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipesend_email_sends (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT,
  offer_id TEXT,
  offer_name TEXT,
  payout REAL,
  recipient_count INTEGER,
  estimated_revenue REAL,
  subject TEXT,
  from_email TEXT,
  mailgun_id TEXT,
  status TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipesend_email_templates (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipesend_products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price TEXT,
  image_url TEXT,
  html TEXT NOT NULL DEFAULT '',
  email_html TEXT,
  sell_link TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipesend_landings (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  html TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  offer_id TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipesend_email_clicks (
  id TEXT PRIMARY KEY,
  token TEXT,
  subscriber_id TEXT,
  email TEXT,
  sell_link TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sponsor_offers_sponsor ON pipesend_sponsor_offers(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_offers_slug ON pipesend_sponsor_offers(slug);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON pipesend_subscribers(token);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON pipesend_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_created ON pipesend_email_sends(created_at);

CREATE TABLE IF NOT EXISTS pipesend_email_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  recipient TEXT,
  mailgun_message_id TEXT,
  timestamp INTEGER,
  ip TEXT,
  country TEXT,
  url TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_type ON pipesend_email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_recipient ON pipesend_email_events(recipient);
