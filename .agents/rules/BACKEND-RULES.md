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

## 3. RÀNG BUỘC BẮT BUỘC VỀ PHÂN QUYỀN
1. **Quyền hiệu lực:** từ quan hệ `UserRole → Role → RolePermission → Permission`, không có cột JSON permissions trên Role. `getSession()` kiểm tra DB mỗi lần: trạng thái tài khoản, phiên bản phiên và quyền hiện tại. Role thuộc tài khoản; không cộng quyền từ các tài khoản khác cùng nhân sự.
2. **Kiểm tra Quyền ở đầu Server Action:**
   - Với thao tác Đọc dữ liệu nhạy cảm: Bắt buộc kiểm tra rõ `"VIEW"` hoặc `"MANAGE"`; thiếu quyền phải từ chối.
   - Với thao tác Ghi (Create/Update/Delete): Bắt buộc kiểm tra `session.permissions[MODULE] === "MANAGE"` (trừ phân hệ TASK cho phép nhân viên cập nhật trạng thái công việc được giao trực tiếp cho mình).
3. **Lọc Dữ liệu (Data Filtering):**
   - Luôn luôn có điều kiện `companyId: session.companyId` trong mọi câu lệnh Prisma.

---

## 4. Server Action Boilerplate Chuẩn Mực

Khi tạo một Server Action mới, Agent BẮT BUỘC áp dụng khung mẫu sau:

```typescript
"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

    // 2. RBAC Guard: Kiểm tra cấp độ quyền trực tiếp từ Session
    if (session.permissions?.TASK !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền thực hiện thao tác này." };
    }

    // 3. Validation với Zod
    const parsed = CreateTaskSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    // 4. Thực thi CSDL an toàn kèm Multi-tenancy CompanyId
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

## 5. Ranh giới hồ sơ và truy cập

- HR MANAGE chỉ sửa hồ sơ, không quản lý mật khẩu/role. `/accounts` và actions tương ứng kiểm tra ADMIN/IT_ADMIN trong bản hiện tại; role management chi tiết theo kế hoạch riêng.
- Không trả password/hash/legacy profile trong payload action hoặc audit. Khi tạo/sửa tài khoản kiểm tra người và role cùng công ty; khóa tài khoản không cập nhật Employee.
- Đăng nhập username duy nhất, không đăng nhập mã nhân viên. Sửa tài khoản hoặc mật khẩu tăng sessionVersion để thu hồi phiên cũ.
- Thay đổi dữ liệu và audit phải cùng transaction cho luồng nhân sự/tài khoản mới.

## 6. HR độc lập — 28/10/2026

- Mọi trường hồ sơ nghiệp vụ có thể sửa bởi HR MANAGE dù có nguồn HR/1Office; nguồn chỉ là lịch sử nhập.
- Schema input strict không nhận employeeCode, companyId, metadata nguồn hoặc role. Mã do DB cấp và không cập nhật; phòng ban bắt buộc cùng công ty. Ghi chú vận hành là notes, không sửa hrNotes gốc qua form.
- Không chạy lại importer snapshot lên hồ sơ vận hành. Seed phải idempotent và không tái sinh hồ sơ/tài khoản đã dọn.
