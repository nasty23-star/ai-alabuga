import type { SphereId } from "@/api/types";

export const PROFILE_SPHERES: { id: SphereId; title: string }[] = [
  { id: "procurement", title: "Закупки" },
  { id: "sales", title: "Продажи" },
  { id: "hiring", title: "Найм" },
  { id: "management", title: "Управление" },
  { id: "founder", title: "Основатель" },
];
