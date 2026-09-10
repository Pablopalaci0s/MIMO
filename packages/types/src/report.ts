import type { ReportTargetType } from "./admin";

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}
