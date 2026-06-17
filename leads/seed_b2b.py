#!/usr/bin/env python3.13
"""Seed the TEMPORARY b2b_prospects table from Google Places (with coordinates
for the admin map). Run AFTER migration 045 has been applied in Supabase.

Reads:
  $GOOGLE_PLACES_API_KEY                       (global, ~/.zshrc)
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (.env.local)

Idempotent: upserts on place_id, so re-running won't create duplicates and
won't clobber a status the owner has already changed (status only set on insert).
"""
import json, os, sys, time, urllib.request, urllib.error

KEY = os.environ.get("GOOGLE_PLACES_API_KEY")
if not KEY:
    sys.exit("GOOGLE_PLACES_API_KEY not set — run: source ~/.zshrc")

# --- load Supabase creds from .env.local ---
HERE = os.path.dirname(__file__)
ENV = os.path.join(HERE, "..", ".env.local")
creds = {}
with open(ENV) as f:
    for line in f:
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        creds[k.strip()] = v.strip().strip('"').strip("'")

SB_URL = creds.get("NEXT_PUBLIC_SUPABASE_URL")
SB_KEY = creds.get("SUPABASE_SERVICE_ROLE_KEY")
if not SB_URL or not SB_KEY:
    sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")

PLACES = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ("places.id,places.displayName,places.formattedAddress,"
          "places.internationalPhoneNumber,places.websiteUri,places.rating,"
          "places.userRatingCount,places.location,"
          "places.regularOpeningHours.weekdayDescriptions,nextPageToken")

QUERIES = [
    ("Japanese restaurants in Lugano, Switzerland", "japanese"),
    ("sushi restaurants in Lugano, Switzerland", "japanese"),
    ("ramen Lugano Switzerland", "japanese"),
    ("izakaya OR teppanyaki Lugano Switzerland", "japanese"),
    ("Asian restaurants in Lugano, Switzerland", "asian"),
    ("hotels in Lugano, Switzerland", "hotel"),
    ("boutique hotels in Lugano, Switzerland", "hotel"),
]


def places_search(query, token=None):
    body = {"textQuery": query, "pageSize": 20, "languageCode": "en"}
    if token:
        body["pageToken"] = token
    req = urllib.request.Request(
        PLACES, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json",
                 "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


# --- collect ---
seen = {}
for query, tag in QUERIES:
    token, pages = None, 0
    while pages < 3:
        data = places_search(query, token)
        for p in data.get("places", []):
            pid = p.get("id")
            if not pid:
                continue
            if pid in seen:
                if tag == "japanese":
                    seen[pid]["category"] = "japanese"
                continue
            loc = p.get("location", {})
            seen[pid] = {
                "place_id": pid,
                "name": p.get("displayName", {}).get("text", ""),
                "address": p.get("formattedAddress"),
                "reviews_count": p.get("userRatingCount"),
                "rating": p.get("rating"),
                "phone": p.get("internationalPhoneNumber"),
                "website": p.get("websiteUri"),
                "category": tag,
                "lat": loc.get("latitude"),
                "lng": loc.get("longitude"),
                "opening_hours": p.get("regularOpeningHours", {}).get(
                    "weekdayDescriptions"
                ),
                # status intentionally omitted -> never touched on re-seed
            }
        token = data.get("nextPageToken")
        pages += 1
        if not token:
            break
        time.sleep(2)

rows = list(seen.values())
print(f"Collected {len(rows)} unique businesses, upserting...")

# --- upsert into Supabase via PostgREST (on_conflict=place_id, ignore dups) ---
url = f"{SB_URL}/rest/v1/b2b_prospects?on_conflict=place_id"
req = urllib.request.Request(
    url, data=json.dumps(rows).encode(), method="POST",
    headers={
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
        # merge-duplicates: enrich existing rows (e.g. new opening_hours) on re-seed.
        # `status` is intentionally NOT in the payload, so PostgREST's upsert leaves
        # any owner-edited status untouched — only the seeded columns are updated.
        "Prefer": "resolution=merge-duplicates,return=representation",
    })
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        inserted = json.load(r)
    print(f"✅ Upserted {len(inserted)} rows into b2b_prospects.")
except urllib.error.HTTPError as e:
    print("❌ Supabase error:", e.code, e.read().decode()[:500])
    sys.exit(1)
