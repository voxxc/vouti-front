
-- whatsapp_pending_messages: restrict to service_role only (edge functions)
DROP POLICY IF EXISTS "service_role_all" ON whatsapp_pending_messages;
CREATE POLICY "service_role_all" ON whatsapp_pending_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- whatsapp_ai_pending_responses: restrict to service_role only
DROP POLICY IF EXISTS "Service role full access" ON whatsapp_ai_pending_responses;
CREATE POLICY "Service role full access" ON whatsapp_ai_pending_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- landing_leads: intentionally open for unauthenticated form submissions
-- Mark as accepted by restricting to anon role (public forms)
DROP POLICY IF EXISTS "Anyone can insert landing leads" ON landing_leads;
CREATE POLICY "Anyone can insert landing leads" ON landing_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);
