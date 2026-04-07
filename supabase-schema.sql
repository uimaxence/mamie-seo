-- ═══════════════════════════════════════════════════
-- Mamie SEO — Supabase Schema
-- Exécuter dans Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════

-- Table des analyses (rate limiting : 1 par email + 1 par IP)
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  url_analyzed TEXT NOT NULL,
  report_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_email ON analyses (email);
CREATE INDEX IF NOT EXISTS idx_analyses_ip ON analyses (ip_address);

-- Table des leads (emails collectés, dédupliqués)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  last_report_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);

-- Table des crédits (analyses de page payantes)
CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  amount INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_email ON credits (email);

-- Table des rapports persistés (historique pour les utilisateurs connectés)
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  url_analyzed TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_email ON reports (email);

-- Table des analyses de page (deep analysis history)
CREATE TABLE IF NOT EXISTS deep_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deep_analyses_user_id ON deep_analyses (user_id);

-- RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_analyses ENABLE ROW LEVEL SECURITY;

-- Atomic credit deduction function (prevents race conditions)
CREATE OR REPLACE FUNCTION deduct_credit(p_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE credits
  SET amount = amount - 1, updated_at = NOW()
  WHERE email = p_email AND amount > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No credits available';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Table des codes promo
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  max_uses INTEGER DEFAULT NULL, -- null = illimité
  used_count INTEGER DEFAULT 0 NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL, -- null = jamais
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (code);

-- Table d'utilisation des codes promo (1 code par email)
CREATE TABLE IF NOT EXISTS promo_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(promo_code, email)
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_uses ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════
-- Nouvelles tables — Product Spec v2
-- ═══════════════════════════════════════════════════

-- Table des demandes de contact (depuis les CTAs dans les rapports)
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  report_id TEXT,
  report_url TEXT,
  report_score INTEGER,
  status TEXT DEFAULT 'new' NOT NULL, -- new | read | replied
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests (email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests (status);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Table de rate limiting par IP (pour analyses sans compte)
CREATE TABLE IF NOT EXISTS ip_rate_limits (
  ip TEXT PRIMARY KEY,
  last_analysis TIMESTAMPTZ DEFAULT now(),
  analysis_count INTEGER DEFAULT 0 NOT NULL
);

-- Pas de policy publique : seul le service_role key peut lire/écrire
