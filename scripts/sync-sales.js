const BASE_ID = "appK0kZ3NoUZhIjCr";
const TABLE_NAME = "Sales";
const TOKEN = process.env.AIRTABLE_TOKEN;

if (!TOKEN) {
  console.error("Missing AIRTABLE_TOKEN environment variable.");
  process.exit(1);
}

const FIELDS = [
  "Property",
  "Broker Seller",
  "Broker Buyer",
  "Price",
  "Buyer",
  "Seller",
  "$ Price/Unit",
  "$ Price/SF",
  "Year Built",
  "Close",
  "Stage",
  "Guidance",
  "$ Guidance/Unit",
  "Latitude (from Property)",
  "Longitude (from Property)",
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
  return Array.isArray(value) && value.length ? value[0] : null;
}

function firstValue(value) {
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value ?? null;
}

async function main() {
  console.log("Fetching Sales...");
  const records = await fetchAllRecords();
  console.log(`Fetched ${records.length} records.`);

  const sales = records
    .map((r) => ({
      id: r.id,
      propertyId: firstLinkedId(r.fields.Property),
      brokerSellerId: firstLinkedId(r.fields["Broker Seller"]),
      brokerBuyerId: firstLinkedId(r.fields["Broker Buyer"]),
      price: typeof r.fields.Price === "number" ? r.fields.Price : null,
      buyerId: firstLinkedId(r.fields.Buyer),
      sellerId: firstLinkedId(r.fields.Seller),
      pricePerUnit: typeof r.fields["$ Price/Unit"] === "number" ? r.fields["$ Price/Unit"] : null,
      pricePerSF: typeof r.fields["$ Price/SF"] === "number" ? r.fields["$ Price/SF"] : null,
      yearBuilt: typeof r.fields["Year Built"] === "number" ? r.fields["Year Built"] : null,
      close: firstValue(r.fields.Close),
      stage: r.fields.Stage || "",
      guidance: typeof r.fields.Guidance === "number" ? r.fields.Guidance : null,
      guidancePerUnit: typeof r.fields["$ Guidance/Unit"] === "number" ? r.fields["$ Guidance/Unit"] : null,
      lat: firstValue(r.fields["Latitude (from Property)"]),
      lng: firstValue(r.fields["Longitude (from Property)"]),
    }))
    .filter((s) => typeof s.lat === "number" && typeof s.lng === "number");

  console.log(`${sales.length} records have valid lat/lng.`);

  const fs = require("fs");
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/sales.json", JSON.stringify(sales));
  console.log("Wrote data/sales.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
