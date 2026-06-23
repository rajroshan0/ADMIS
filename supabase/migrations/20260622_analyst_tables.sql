-- ═══════════════════════════════════════════════════════════════
-- ADMIS — Analyst Department Tables
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add 'analyst' to the task_department enum
ALTER TYPE task_department ADD VALUE IF NOT EXISTS 'analyst';

-- 2. Channel Analysis — metrics decision table (fed by YouTube API + auto-scoring)
CREATE TABLE IF NOT EXISTS channel_analysis (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid REFERENCES deals(id) ON DELETE CASCADE,
  brand_id            uuid REFERENCES brands(id) ON DELETE CASCADE,
  creator_id          uuid REFERENCES creators(id) ON DELETE SET NULL,

  -- Channel identity
  channel_name        text,
  channel_url         text,
  channel_id          text,            -- YouTube channel ID (UCxxxx)
  platform            text DEFAULT 'youtube',
  country             text,

  -- YouTube metrics
  subscribers         bigint,
  avg_views_l10       numeric,         -- avg views, last 10 videos
  avg_likes           numeric,
  avg_comments        numeric,
  avg_views_90d       numeric,         -- avg views of videos in last 90 days
  last_upload_at      timestamptz,
  days_since_upload   integer,
  videos_90d          integer,         -- video count in last 90 days
  shorts_pct          numeric,         -- % of recent uploads that are Shorts (< 60s)

  -- Derived estimates
  est_monthly_views   numeric,
  est_value_usd       numeric,
  engagement_pct      numeric,         -- (likes + comments) / views × 100
  view_sub_pct        numeric,         -- avg_views / subscribers × 100
  uploads_per_month   numeric,

  -- Auto scoring
  lead_score          numeric,         -- 0–100
  lead_tier           text,            -- 'A' | 'B' | 'C' | 'D'
  is_suspicious       boolean DEFAULT false,
  suspicious_reasons  text[],

  -- Pricing
  creator_price_usd   numeric,
  cpm2_value          numeric,         -- est_monthly_views / 1000 × 2
  cpm3_value          numeric,         -- est_monthly_views / 1000 × 3
  counter_price_usd   numeric,
  final_decision      text DEFAULT 'pending',  -- pending | approve | reject | counter

  -- Raw API response for debugging / re-scoring
  raw_api_data        jsonb,
  fetched_at          timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ca_deal_idx    ON channel_analysis(deal_id);
CREATE INDEX IF NOT EXISTS ca_brand_idx   ON channel_analysis(brand_id);
CREATE INDEX IF NOT EXISTS ca_creator_idx ON channel_analysis(creator_id);

ALTER TABLE channel_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_own_channel_analysis" ON channel_analysis
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
  );

-- 3. Analyst Reports — final summarised decision per deal
CREATE TABLE IF NOT EXISTS analyst_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid REFERENCES deals(id) ON DELETE CASCADE,
  channel_analysis_id uuid REFERENCES channel_analysis(id) ON DELETE SET NULL,
  brand_id            uuid REFERENCES brands(id) ON DELETE CASCADE,
  creator_id          uuid REFERENCES creators(id) ON DELETE SET NULL,
  analyst_id          uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Snapshot of channel & creator info at time of report
  channel_name        text,
  channel_url         text,
  platform            text,
  geo                 text,
  deliveries          text[],          -- ['video', 'short', 'reel', 'story', 'post', 'other']
  creator_price       numeric,
  creator_contact     text,            -- email / phone snapshot

  -- Decision
  score               numeric,         -- 0–100
  approved            boolean,
  counter_price       numeric,
  notes               text,            -- reason for rejection / analyst remarks

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ar_deal_idx    ON analyst_reports(deal_id);
CREATE INDEX IF NOT EXISTS ar_brand_idx   ON analyst_reports(brand_id);
CREATE INDEX IF NOT EXISTS ar_analyst_idx ON analyst_reports(analyst_id);

ALTER TABLE analyst_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_own_analyst_reports" ON analyst_reports
  FOR ALL USING (
    brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
  );
