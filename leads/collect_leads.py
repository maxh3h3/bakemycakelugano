#!/usr/bin/env python3.13
"""Collect B2B prospects (restaurants + hotels) from Google Places API (New).
Key comes from $GOOGLE_PLACES_API_KEY (global, set in ~/.zshrc)."""
import json, os, sys, time, csv, urllib.request

KEY = os.environ.get("GOOGLE_PLACES_API_KEY")
if not KEY:
    sys.exit("GOOGLE_PLACES_API_KEY not set — run: source ~/.zshrc")

ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ("places.id,places.displayName,places.formattedAddress,"
          "places.internationalPhoneNumber,places.websiteUri,places.rating,"
          "places.userRatingCount,places.primaryTypeDisplayName,places.businessStatus,"
          "nextPageToken")

# (query, tag) — Japanese gets priority; hotels collected separately.
QUERIES = [
    ("Japanese restaurants in Lugano, Switzerland", "japanese"),
    ("sushi restaurants in Lugano, Switzerland", "japanese"),
    ("ramen Lugano Switzerland", "japanese"),
    ("izakaya OR teppanyaki Lugano Switzerland", "japanese"),
    ("Asian restaurants in Lugano, Switzerland", "asian"),
    ("hotels in Lugano, Switzerland", "hotel"),
    ("boutique hotels in Lugano, Switzerland", "hotel"),
]

def search(query, page_token=None):
    body = {"textQuery": query, "pageSize": 20, "languageCode": "en"}
    if page_token:
        body["pageToken"] = page_token
    req = urllib.request.Request(
        ENDPOINT, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json",
                 "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

seen, rows = {}, []
for query, tag in QUERIES:
    token, pages = None, 0
    while pages < 3:  # up to ~60 per query
        data = search(query, token)
        for p in data.get("places", []):
            pid = p.get("id")
            if not pid or pid in seen:
                if pid in seen and tag == "japanese":
                    seen[pid]["category"] = "japanese"  # upgrade tag
                continue
            row = {
                "name": p.get("displayName", {}).get("text", ""),
                "category": tag,
                "type": p.get("primaryTypeDisplayName", {}).get("text", ""),
                "address": p.get("formattedAddress", ""),
                "phone": p.get("internationalPhoneNumber", ""),
                "website": p.get("websiteUri", ""),
                "rating": p.get("rating", ""),
                "reviews": p.get("userRatingCount", ""),
                "status": p.get("businessStatus", ""),
            }
            seen[pid] = row
            rows.append(row)
        token = data.get("nextPageToken")
        pages += 1
        if not token:
            break
        time.sleep(2)  # token needs a moment to activate

# Sort: Japanese first, then by review count ascending (smaller = fewer reviews)
order = {"japanese": 0, "asian": 1, "hotel": 2}
rows.sort(key=lambda r: (order.get(r["category"], 9),
                         r["reviews"] if isinstance(r["reviews"], int) else 9999))

out = os.path.join(os.path.dirname(__file__), "lugano_leads.csv")
with open(out, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["name", "category", "type", "address",
                                      "phone", "website", "rating", "reviews", "status"])
    w.writeheader()
    w.writerows(rows)

jp = sum(1 for r in rows if r["category"] == "japanese")
print(f"Collected {len(rows)} unique businesses ({jp} Japanese) -> {out}")
