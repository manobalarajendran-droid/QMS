const SB_URL = "https://kvwpgyswjzaojvmzorxr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3BneXN3anphb2p2bXpvcnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTY3MjgsImV4cCI6MjA4OTc5MjcyOH0.ohJsuifkyExeybnMsl0ecWIlZ9_FhyGlQgi3ai0KVSg";
const SB_TBL = "ied_state";
const K_QMS  = "qms_react_v1";

const SB_HDR = {
  "Content-Type":  "application/json",
  "apikey":        SB_KEY,
  "Authorization": "Bearer " + SB_KEY,
  "Prefer":        "return=minimal"
};

/**
 * Gathers all Zustand persistence stores from localStorage
 * and packages them into a single state object.
 */
function gatherLocalState() {
  const state: any = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('qatrial:')) {
      try {
        state[key] = JSON.parse(localStorage.getItem(key) || '{}');
      } catch (e) {
        // ignore
      }
    }
  }
  return state;
}

/**
 * Pushes the current local state to Supabase.
 */
export async function pushToSupabase() {
  const ts = new Date().toISOString();
  const value = gatherLocalState();
  const payload = { ...value, _cloud_ts: ts };
  
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TBL}`, {
      method: "POST",
      headers: { ...SB_HDR, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ key: K_QMS, value: payload, updated_at: ts })
    });
    
    if (!res.ok) {
      console.error('Supabase Push Failed', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase Push Error', err);
    return false;
  }
}

/**
 * Pulls the latest state from Supabase and applies it to localStorage.
 * Requires a page reload afterwards to re-initialize Zustand stores.
 */
export async function pullFromSupabase() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${SB_TBL}?key=eq.${K_QMS}&select=value`, {
      method: "GET",
      headers: SB_HDR
    });
    
    if (!res.ok) {
      console.error('Supabase Pull Failed', await res.text());
      return false;
    }
    
    const data = await res.json();
    if (data && data.length > 0 && data[0].value) {
      const payload = data[0].value;
      
      // Update localStorage with the fetched state
      Object.keys(payload).forEach(key => {
        if (key.startsWith('qatrial:')) {
          localStorage.setItem(key, JSON.stringify(payload[key]));
        }
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Supabase Pull Error', err);
    return false;
  }
}
