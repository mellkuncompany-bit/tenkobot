import { PlanType } from "@/lib/types/firestore";

export interface PlanDetails {
  name: string;
  price: number;
  duration: number; // days for trial, 30 for monthly plans
  limits: {
    maxStaffs: number;
    maxShiftsPerMonth: number;
    maxEscalationStages: number;
  };
  features: string[];
}

export const PLANS: Record<PlanType, PlanDetails> = {
  trial: {
    name: "トライアル",
    price: 0,
    duration: 14,
    limits: {
      maxStaffs: 5,
      maxShiftsPerMonth: 50,
      maxEscalationStages: 2,
    },
    features: [
      "14日間無料",
      "スタッフ5名まで",
      "月間シフト50件まで",
      "エスカレーション2段階まで",
    ],
  },
  basic: {
    name: "ベーシック",
    price: 9800,
    duration: 30,
    limits: {
      maxStaffs: 20,
      maxShiftsPerMonth: 500,
      maxEscalationStages: 3,
    },
    features: [
      "スタッフ20名まで",
      "月間シフト500件まで",
      "エスカレーション3段階",
      "LINE通知",
      "SMS・架電通知",
      "勤怠管理",
    ],
  },
  premium: {
    name: "プレミアム",
    price: 29800,
    duration: 30,
    limits: {
      maxStaffs: 100,
      maxShiftsPerMonth: 9999,
      maxEscalationStages: 3,
    },
    features: [
      "スタッフ100名まで",
      "月間シフト無制限",
      "エスカレーション3段階",
      "LINE通知",
      "SMS・架電通知",
      "勤怠管理",
      "優先サポート",
    ],
  },
  enterprise: {
    name: "エンタープライズ",
    price: 0, // Contact for pricing
    duration: 30,
    limits: {
      maxStaffs: 9999,
      maxShiftsPerMonth: 99999,
      maxEscalationStages: 5,
    },
    features: [
      "スタッフ無制限",
      "シフト無制限",
      "エスカレーション5段階",
      "LINE通知",
      "SMS・架電通知",
      "勤怠管理",
      "専任サポート",
      "カスタマイズ対応",
    ],
  },
};

/**
 * Check if organization exceeds plan limits
 */
export function checkPlanLimits(
  plan: PlanType,
  current: {
    staffs: number;
    shiftsThisMonth: number;
  }
): {
  exceeded: boolean;
  reasons: string[];
} {
  const planDetails = PLANS[plan];
  const reasons: string[] = [];

  if (current.staffs >= planDetails.limits.maxStaffs) {
    reasons.push(`スタッフ数が上限（${planDetails.limits.maxStaffs}名）に達しています`);
  }

  if (current.shiftsThisMonth >= planDetails.limits.maxShiftsPerMonth) {
    reasons.push(`今月のシフト数が上限（${planDetails.limits.maxShiftsPerMonth}件）に達しています`);
  }

  return {
    exceeded: reasons.length > 0,
    reasons,
  };
}
