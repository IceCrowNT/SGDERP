import "dotenv/config"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const handoverItems = [
  { lineNumber: 1, code: "DESKTOP", name: "Máy tính lắp ráp", quantity: 33 },
  { lineNumber: 2, code: "LAPTOP", name: "Laptop", quantity: 19 },
  { lineNumber: 3, code: "WIFI_AP", name: "Bộ phát Wifi", quantity: 10 },
  { lineNumber: 4, code: "PBX", name: "Tổng đài", quantity: 1 },
  { lineNumber: 5, code: "DESK_PHONE", name: "Điện thoại bàn", quantity: 8 },
  { lineNumber: 6, code: "SERVER", name: "Máy chủ Dell T360", quantity: 1 },
  { lineNumber: 7, code: "UPS", name: "UPS online MHPRO 3000", quantity: 1 },
  { lineNumber: 8, code: "LOAD_BALANCER", name: "Cân bằng tải Ruijie NBR6205-E", quantity: 1 },
  { lineNumber: 9, code: "NETWORK_SWITCH", name: "Switch Cisco 24 Port 100/1000", quantity: 1 },
  { lineNumber: 10, code: "PRINTER", name: "Máy in", quantity: 12 },
  { lineNumber: 11, code: "SCANNER", name: "Máy Scan", quantity: 3 },
] as const

async function main() {
  const company = await prisma.company.findUnique({
    where: { taxCode: "0200765782" },
    select: { id: true },
  })

  if (!company) {
    throw new Error("Chưa có công ty Sao Đỏ. Hãy chạy seed chính trước khi nạp biên bản tài sản IT.")
  }

  await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, number>()

    for (const item of handoverItems) {
      const category = await tx.assetCategory.upsert({
        where: {
          companyId_code: {
            companyId: company.id,
            code: item.code,
          },
        },
        update: {
          name: item.name,
          trackingMode: "INDIVIDUAL",
          isActive: true,
        },
        create: {
          companyId: company.id,
          code: item.code,
          name: item.name,
          trackingMode: "INDIVIDUAL",
        },
      })

      categoryIds.set(item.code, category.id)
    }

    const document = await tx.assetInventoryDocument.upsert({
      where: {
        companyId_documentNumber: {
          companyId: company.id,
          documentNumber: "BMHC 0501",
        },
      },
      update: {
        title: "Biên bản bàn giao tài sản - Thiết bị phần cứng",
        transferorName: "Nguyễn Minh Dương",
        transferorPosition: "IT",
        status: "DRAFT",
        notes:
          "Ảnh nguồn chưa có ngày bàn giao và thông tin bên nhận. Tổng số lượng trên biên bản: 90 thiết bị; cần IT kiểm kê mã tài sản/serial trước khi xác nhận.",
      },
      create: {
        companyId: company.id,
        documentNumber: "BMHC 0501",
        title: "Biên bản bàn giao tài sản - Thiết bị phần cứng",
        transferorName: "Nguyễn Minh Dương",
        transferorPosition: "IT",
        status: "DRAFT",
        notes:
          "Ảnh nguồn chưa có ngày bàn giao và thông tin bên nhận. Tổng số lượng trên biên bản: 90 thiết bị; cần IT kiểm kê mã tài sản/serial trước khi xác nhận.",
      },
    })

    for (const item of handoverItems) {
      await tx.assetInventoryLine.upsert({
        where: {
          documentId_lineNumber: {
            documentId: document.id,
            lineNumber: item.lineNumber,
          },
        },
        update: {
          companyId: company.id,
          categoryId: categoryIds.get(item.code),
          itemName: item.name,
          quantity: item.quantity,
          unit: "Cái",
        },
        create: {
          companyId: company.id,
          documentId: document.id,
          categoryId: categoryIds.get(item.code),
          lineNumber: item.lineNumber,
          itemName: item.name,
          quantity: item.quantity,
          unit: "Cái",
        },
      })
    }
  })

  console.log("Đã nạp bản nháp BMHC 0501: 11 nhóm, tổng 90 thiết bị. Chưa tạo tài sản cá thể.")
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
