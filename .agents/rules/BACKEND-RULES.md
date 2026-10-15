# QUY TRÌNH & RÀNG BUỘC BACKEND (SERVER ACTIONS & RBAC SECURITY)

Tệp này quản lý cách thức xây dựng Logic Backend và Bảo mật Phân quyền cho Next.js Monolith trong dự án Sao Đỏ Group ERP.

---

## 1. Ranh giới Kiến trúc
- Sử dụng **Next.js Server Actions** (với chỉ thị `"use server"`) để xử lý toàn bộ các tác vụ Mutation (Tạo, Sửa, Xóa, Duyệt).
- Các API REST (`/api/`) chỉ dùng khi cần tích hợp với bên thứ ba (Webhooks, Mobile App). Các tương tác UI nội bộ phải đi qua Server Actions.

---

## 2. Ràng buộc Nghiệp vụ Cốt lõi
- **Không tin tưởng Client:**
  - Tuyệt đối KHÔNG LẤY `userId` hoặc `companyId` từ form payload của Client gửi lên để thực hiện tác vụ Create/Update.
  - LUÔN LẤY danh tính và quyền hạn người dùng thông qua Session ở Server.
- **Xác thực dữ liệu (Validation):**
  - Mọi payload từ Client phải được bọc trong một Schema của `zod`.
  - Phải xử lý `safeParse` để bắt lỗi Validation trước khi đi vào Logic lõi.
- **Tính toàn vẹn (ACID Transactions):**
  - Khi một tác vụ yêu cầu Ghi (Create/Update/Delete) vào từ 2 bảng trở lên, **BẮT BUỘC** dùng `prisma.$transaction`. Nếu 1 bảng lỗi, toàn bộ phải rollback.

---

## 3. RÀNG BUỘC BẮT BUỘC VỀ PHÂN QUYỀN (RBAC GUARDS CHO MỌI TÍNH NĂNG MỚI)
Mọi tính năng được phát triển mới trong tương lai (Quản lý công việc `TASK`, Phê duyệt `APPROVAL`, Kho vận, Tài chính...) **BẮT BUỘC** phải tuân theo chuẩn phân quyền hệ thống:

1. **Khai báo Permission chuẩn:** Mọi quyền hạn mới phải theo cấu trúc:
   - `module`: Mã phân hệ viết hoa (VD: `HR`, `TASK`, `APPROVAL`, `REPORT`, `SYSTEM`).
   - `action`: Hành động viết hoa (VD: `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `ASSIGN`, `APPROVE`, `MANAGE`).
   - `scope`: Phạm vi tác động (`ALL` - Toàn tập đoàn, `DEPARTMENT` - Nội bộ phòng ban, `PERSONAL` - Chỉ cá nhân).
2. **Bắt buộc Kiểm tra Quyền ở đầu Server Action (Auth Guard):**
   - Trước khi thực thi bất kỳ logic ghi hoặc đọc nhạy cảm nào, BẮT BUỘC gọi:
     ```typescript
     await requirePermission(session, "MODULE_NAME", "ACTION_NAME");
     ```
   - Nếu không đủ quyền, trả về ngay `{ success: false, message: "Bạn không có quyền thực hiện thao tác này." }`.
3. **Lọc Dữ liệu theo Phạm vi (Data Scope Filtering):**
   - **Scope ALL:** Query toàn bộ dữ liệu thuộc `companyId`.
   - **Scope DEPARTMENT:** Ép buộc thêm điều kiện `departmentId: session.departmentId`.
   - **Scope PERSONAL:** Ép buộc thêm điều kiện `userId: session.userId` hoặc `createdBy: session.userId`.

---

## 4. Server Action Boilerplate Chuẩn Mực

Khi tạo một Server Action mới, Agent BẮT BUỘC áp dụng khung mẫu sau:

```typescript
"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

const CreateTaskSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  assignedToId: z.string().uuid(),
  // ...
});

export async function createTask(formData: any) {
  try {
    // 1. Kiểm tra Session (Danh tính người dùng)
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập hết hạn." };
    }

    // 2. RBAC Guard: Bắt buộc kiểm tra quyền theo module và hành động
    await requirePermission(session, "TASK", "CREATE");

    // 3. Validation với Zod
    const parsed = CreateTaskSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    // 4. Thực thi Transaction CSDL an toàn
    const task = await prisma.task.create({
      data: {
        ...parsed.data,
        companyId: session.companyId,
        departmentId: session.departmentId,
        createdBy: session.userId,
      },
    });

    return { success: true, data: task };
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, message: error.message || "Lỗi xử lý hệ thống." };
  }
}
```
