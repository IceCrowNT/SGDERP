import { test, expect } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";

test("Prisma Studio model and scalar names match the PostgreSQL schema", async () => {
  const db = new PrismaClient();
  try {
    const columns = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name, ordinal_position`;
    const tables = [...new Set(columns.map((column) => column.table_name))].sort();
    const models = Prisma.dmmf.datamodel.models;
    expect(models.map((model) => model.name).sort()).toEqual(tables);
    for (const model of models) {
      expect(model.dbName ?? model.name).toBe(model.name);
      expect(model.name).toMatch(/^[a-z]+(?:_[a-z]+)*$/);
      const scalars = model.fields.filter((field) => field.kind !== "object");
      expect(scalars.map((field) => field.name).sort()).toEqual(
        columns.filter((column) => column.table_name === model.name)
          .map((column) => column.column_name).sort(),
      );
      for (const field of model.fields) {
        expect(field.name).toMatch(/^[a-z]+(?:_[a-z]+)*$/);
        if (field.kind !== "object") expect(field.dbName ?? field.name).toBe(field.name);
      }
    }
  } finally {
    await db.$disconnect();
  }
});
