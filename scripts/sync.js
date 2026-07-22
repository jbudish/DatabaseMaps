// Pulls Properties from Airtable and writes a lightweight JSON file for the map.
// Uses Node's built-in fetch (available on GitHub Actions runners, Node 20+).

const BASE_ID = "appK0kZ3NoUZhIjCr";
const TABLE_NAME = "Properties";
const TOKEN = process.env.AIRTABLE_TOKEN;

if (!TOKEN) {
  console.error("Missing AIRTABLE_TOKEN environment variable.");
  process.exit(1);
}

const FIELDS = [
  "Latitude",
  "Longitude",
  "City",
  "OwnerName",
  "Type",
  "Year Built",
  "Submarket",
  "Close",
  "Property",
  "Units",
  "Yardi Link",
];

async function fetchAllRecords() {
  const records = [];
  let offset = undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    FIELDS.forEach((f) => params.append("fields[]", f));
    if (offset) params.set("offset", offset);

    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;

    if (offset) await new Promise((r) => setTimeout(r, 250));
  } while (offset);

  return records;
}

function firstValue(value) {
  // Lookup fields return an array, even for a single linked record.
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value ?? null;
}

function extractOwner(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value || "";
}

async function main() {
  console.log("Fetching records from Airtable...");
  const records = await fetchAllRecords();
  console.log(`Fetched ${records.length} records.`);

  const properties = records
    .map((r) => ({
      id: r.id,
      lat: r.fields.Latitude,
      lng: r.fields.Longitude,
      name: r.fields["Property"] || "",
      city: r.fields.City || "",
      owner: extractOwner(r.fields.OwnerName),
      type: r.fields.Type || "",
      yearBuilt: typeof r.fields["Year Built"] === "number" ? r.fields["Year Built"] : null,
      submarket: r.fields.Submarket || "",
      close: firstValue(r.fields.Close), // ISO date string, e.g. "2023-04-12"
      units: typeof r.fields.Units === "number" ? r.fields.Units : null,
      yardiLink: r.fields["Yardi Link"] || "",
    }))
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number");

  console.log(`${properties.length} records have valid lat/lng.`);

  const fs = require("fs");
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/properties.json", JSON.stringify(properties));
  console.log("Wrote data/properties.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
