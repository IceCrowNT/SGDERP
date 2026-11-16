import test from "node:test";
import assert from "node:assert/strict";
import { equipmentForAssets } from "../../src/lib/office-3d/hcns-layout";

test("all current IT categories select their own representative, including SCN / Máy Scan", () => {
  const categories = [
    ["PC", "Máy tính bàn"], ["LAPTOP", "Laptop"], ["AP", "Bộ phát WiFi"],
    ["TEL", "Điện thoại bàn"], ["PBX", "Tổng đài"], ["SRV", "Máy chủ"],
    ["UPS", "UPS"], ["LB", "Cân bằng tải"], ["SW", "Switch"],
    ["PRN", "Máy in"], ["SCN", "Máy Scan"],
  ];
  assert.deepEqual(equipmentForAssets(categories.map(([categoryCode, category]) => ({categoryCode, category}))),
    ["pc", "laptop", "access-point", "phone", "pbx", "server", "ups", "router", "switch", "printer", "scanner"]);
});

test("custom codes recognize Vietnamese and English scanner names; exact code wins", () => {
  for (const category of ["Máy Scan", "máy scaner", "Scanner", "Máy quét tài liệu", "may scan"])
    assert.deepEqual(equipmentForAssets([{categoryCode: "CUSTOM", category}]), ["scanner"]);
  assert.deepEqual(equipmentForAssets([{categoryCode: " scn ", category: "Thiết bị máy in"}]), ["scanner"]);
  assert.deepEqual(equipmentForAssets([{categoryCode: "CUSTOM", category: "Bộ định tuyến WiFi"}]), ["router"]);
});

test("empty data stays empty, unknown categories use fallback, representative dedup never alters records", () => {
  const assets = [{categoryCode:"SCN", category:"Máy Scan"}, {categoryCode:"OTHER", category:"Máy quét"}, {categoryCode:"NEW", category:"Thiết bị mới"}];
  const before = structuredClone(assets);
  assert.deepEqual(equipmentForAssets([]), []);
  assert.deepEqual(equipmentForAssets(assets), ["scanner", "generic"]);
  assert.deepEqual(assets, before);
});

test("a shared equipment shape resolves all matching records, never silently picks the first", async () => {
  const {assetsForEquipment} = await import("../../src/lib/office-3d/hcns-layout");
  const assets = [
    {id:1,name:"Scan A",categoryCode:"SCN",category:"Máy Scan"},
    {id:2,name:"PC",categoryCode:"PC",category:"Máy tính"},
    {id:3,name:"Scan B",categoryCode:"CUSTOM",category:"Máy quét"},
  ] as Parameters<typeof assetsForEquipment>[0];
  assert.deepEqual(assetsForEquipment(assets,"scanner").map(a=>a.id),[1,3]);
  assert.deepEqual(assetsForEquipment(assets,"phone"),[]);
});
