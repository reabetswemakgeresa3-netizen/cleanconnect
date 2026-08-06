// Supabase Edge Function: system-health
// Admin-only diagnostics for the System Health tab: pings Twilio with the
// stored credentials (no message sent) and reports which mode the
// process-refund function's Yoco key is in. Never returns the secrets
// themselves, only pass/fail + derived mode.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !userData.user) return json({ error: 'Not signed in.' })

    const { data: adminRow } = await supabase.from('admin_users').select('id').eq('id', userData.user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Admins only.' })

    const TWILIO_SID = Deno.env.get('TWILIO_SID')
    const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN')
    const YOCO_SECRET_KEY = Deno.env.get('YOCO_SECRET_KEY')

    let twilio: { ok: boolean; detail: string }
    if (!TWILIO_SID || !TWILIO_TOKEN) {
      twilio = { ok: false, detail: 'Credentials not set' }
    } else {
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}.json`, {
          headers: { 'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}` }
        })
        twilio = res.ok ? { ok: true, detail: 'Connected' } : { ok: false, detail: `Twilio responded ${res.status}` }
      } catch {
        twilio = { ok: false, detail: 'Could not reach Twilio' }
      }
    }

    const yoco = !YOCO_SECRET_KEY
      ? { configured: false, mode: 'not set' }
      : { configured: true, mode: YOCO_SECRET_KEY.startsWith('sk_live_') ? 'live' : YOCO_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'unknown' }

    return json({ success: true, supabaseUrl: SUPABASE_URL, twilio, yoco })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Something went wrong.' })
  }
})
