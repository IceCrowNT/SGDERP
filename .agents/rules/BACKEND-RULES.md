# QUY TRÌNH & RÀNG BUỘC BACKEND (SERVER ACTIONS)

Tệp này quản lý cách thức xây dựng Logic Backend cho Next.js 15 Monolith. 

## 1. Ranh giới Kiến trúc
- Sử dụng **Next.js Server Actions** (với chỉ thị `"use server"`) để xử lý toàn bộ các tác vụ Mutation (Tạo, Sửa, Xóa).
- Các API REST (`/api/`) chỉ dùng khi cần tích hợp với bên thứ ba (Webhooks, Mobile App). Các tương tác UI nội bộ phải đi qua Server Actions.

## 2. Ràng buộc Nghiệp vụ cốt lõi
- **Không tin tưởng Client:**
  - Tuyệt đối KHÔNG LẤY `userId` hoặc `companyId` từ form payload của Client gửi lên để thực hiện tác vụ Create/Update.
  - LUÔN LẤY danh tính người dùng thông qua Session ở Server.
- **Xác thực dữ liệu (Validation):**
  - Mọi payload từ Client phải được bọc trong một Schema của `zod`.
  - Phải xử lý `safeParse` để bắt lỗi Validation trước khi đi vào Logic lõi.
- **Tính toàn vẹn (ACID Transactions):**
  - Khi một tác vụ yêu cầu Ghi (Create/Update/Delete) vào từ 2 bảng trở lên, **BẮT BUỘC** dùng `prisma.$transaction`. Nếu 1 bảng lỗi, toàn bộ phải rollback.

## 3. Server Action Boilerplate (Khung Mẫu Bắt Buộc)

Khi tạo một Server Action, Agent phải clone lại cấu trúc chuẩn này:

```typescript
"use server";

import { z } from "zod";
import prisma from "@/lib/prisma"; // Adjust path as needed
// import { getSession } from "@/lib/auth"; 

// 1. DTO Schema
const CreateEntitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  // ...
});

export async function createEntity(formData: FormData | any) {
  try {
    // 2. Kiểm tra Session (Auth Guard)
    // const session = await getSession();
    // if (!session?.userId) throw new Error("Unauthorized");
    const session = { userId: "mock-id", companyId: "mock-company" }; // Tạm thời trong lúc chưa ghép Auth

    // 3. Validation
    const parsed = CreateEntitySchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    // 4. Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          ...parsed.data,
          companyId: session.companyId,
          createdBy: session.userId,
        },
      });
      // Liên kết bảng khác nếu có...
      return entity;
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, message: error.message || "Lỗi hệ thống" };
  }
}
```
