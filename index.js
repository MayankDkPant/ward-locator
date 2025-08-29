import express from "express";
import * as turf from "@turf/turf";
import fs from "fs";

// Load GeoJSON from file (works everywhere)
const wards = JSON.parse(
  fs.readFileSync(new URL("./wards.geojson", import.meta.url), "utf-8")
);

const app = express();
app.use(express.json());

// Preload polygons
const polys = wards.features.map(f => ({
  no: Number(f.properties.wardNo ?? f.properties.Ward_No),
  name: String(f.properties.wardName ?? f.properties.Ward_Name),
  geom:
    f.geometry.type === "MultiPolygon"
      ? turf.multiPolygon(f.geometry.coordinates)
      : turf.polygon(f.geometry.coordinates),
}));

app.post("/ward/locate", (req, res) => {
  const { lat, lon } = req.body || {};
  if (typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ error: "lat and lon required (numbers)" });
  }
  const pt = turf.point([lon, lat]); // [lon, lat]
  for (const f of polys) {
    if (turf.booleanPointInPolygon(pt, f.geom)) {
      return res.json({ wardNo: f.no, wardName: f.name });
    }
  }
  return res.status(404).json({ error: "No ward matched" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Ward locator running on :${port}`));
