const BASE_ID = "appK0kZ3NoUZhIjCr";
const TABLE_NAME = "Companies";
const TOKEN = process.env.AIRTABLE_TOKEN;

if (!TOKEN) {
  console.error("Missing AIRTABLE_TOKEN environment variable.");
  process.exit(1);
}

const FIELDS = ["Company"];

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

async function main() {
  console.log("Fetching Companies...");
  const records = await fetchAllRecords();
  console.log(`Fetched ${records.length} records.`);

  const companies = records.map((r) => ({
    id: r.id,
    name: r.fields["Company"] || "",
  }));

  const fs = require("fs");
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/companies.json", JSON.stringify(companies));
  console.log("Wrote data/companies.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
