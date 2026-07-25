const BASE_ID = "appK0kZ3NoUZhIjCr";
const TABLE_NAME = "Properties";
const TOKEN = process.env.AIRTABLE_TOKEN;

if (!TOKEN) {
  console.error("Missing AIRTABLE_TOKEN environment variable.");
  process.exit(1);
}

const FIELDS = [
  "Property",
  "Address",
  "Units",
  "Owner",
  "City",
  "Submarket",
  "Year Built",
  "Type",
  "Yardi Link",
  "Latitude",
  "Longitude",
  "Developer",
  "Development Equity",
  "Avg Unit SF",
  "Square Feet",
  "Occupancy",
  "Rent PSF",
  "Avg Rent",
];

async function fetchAllRecords() {
  const records = [];
  let offset;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    FIELDS.forEach((f) => params.append("fields[]", f));
    if (offset) params.set("offset", offset);

    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

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

function firstLinkedId(value) {
  // Link fields return an array of record IDs.
  return Array.isArray(value) && value.length ? value[0] : null;
}

async function main() {
  console.log("Fetching Properties...");
  const records = await fetchAllRecords();
  console.log(`Fetched ${records.length} records.`);

  const properties = records
    .map((r) => ({
      id: r.id,
      name: r.fields["Property"] || "",
      address: r.fields["Address"] || "",
      units: typeof r.fields.Units === "number" ? r.fields.Units : null,
      ownerId: firstLinkedId(r.fields.Owner),
      city: r.fields.City || "",
      submarket: r.fields.Submarket || "",
      yearBuilt: typeof r.fields["Year Built"] === "number" ? r.fields["Year Built"] : null,
      type: r.fields.Type || "",
      yardiLink: r.fields["Yardi Link"] || "",
      lat: r.fields.Latitude,
      lng: r.fields.Longitude,
      developerId: firstLinkedId(r.fields.Developer),
      developmentEquity: typeof r.fields["Development Equity"] === "number" ? r.fields["Development Equity"] : null,
      avgUnitSF: typeof r.fields["Avg Unit SF"] === "number" ? r.fields["Avg Unit SF"] : null,
      occupancy: typeof r.fields.Occupancy === "number" ? r.fields.Occupancy : null,
      rentPSF: typeof r.fields["Rent PSF"] === "number" ? r.fields["Rent PSF"] : null,
      avgRent: typeof r.fields["Avg Rent"] === "number" ? r.fields["Avg Rent"] : null,
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
