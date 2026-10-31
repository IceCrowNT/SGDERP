/** One-time HR cleanup completed on 28/10/2026.
 * Retired on 31/10/2026 with the asset schema it checked. The original script
 * and data are in the private backup; do not replay cleanup on live HR data.
 */
console.error("Lệnh làm sạch HR lịch sử đã ngừng sử dụng. HR hiện quản lý độc lập; không xóa lại hồ sơ hoặc tài khoản.");
process.exitCode = 1;
