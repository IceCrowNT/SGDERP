/** Historical importer retired after HR became independent on 28/10/2026.
 * Its reviewed implementation remains in Git history. Never replay the old snapshot
 * over operational records; seed bootstraps an empty HR module only once.
 */
console.error(
  "Importer lịch sử đã ngừng sử dụng: HR hiện quản lý độc lập. Dùng seed cho DB mới; không nạp lại đè dữ liệu ERP.",
);
process.exitCode = 1;
