import { test } from "node:test";
import assert from "node:assert/strict";
import { excelDate, matchEmployee } from "../../prisma/hr-final-data";

test("Excel date stays on the calendar day including historical Vietnam timezone", () => {
  assert.equal(excelDate(23645).toISOString(), "1964-09-25T00:00:00.000Z");
  assert.throws(() => excelDate("9/25/64"));
  assert.throws(() => excelDate(60));
});
test("ambiguous names stop matching; reviewed duplicate keeps separate identities", () => {
  assert.throws(() =>
    matchEmployee({ fullName: "Người trùng" }, [
      { fullName: "Người trùng", employeeCode: "A" },
      { fullName: "Người trùng", employeeCode: "B" },
    ]),
  );
  const people = [
    { fullName: "Đào Thị Thu Trang", employeeCode: "SDG-070" },
    { fullName: "Đào Thị Thu Trang", employeeCode: "SDG-018" },
  ];
  assert.equal(
    matchEmployee({ fullName: "Đào Thị Thu Trang" }, people)?.employeeCode,
    "SDG-018",
  );
  assert.equal(
    matchEmployee({ fullName: "YOON JOON SUN" }, [
      { fullName: "Joonsun Yoon", employeeCode: "SDG-010" },
    ])?.employeeCode,
    "SDG-010",
  );
  assert.equal(matchEmployee({ fullName: "Nhân sự mới" }, people), undefined);
});
