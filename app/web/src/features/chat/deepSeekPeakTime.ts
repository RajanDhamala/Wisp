const BEIJING_UTC_OFFSET_HOURS = 8;

const DEEPSEEK_PEAK_WINDOWS = [
  { startHour: 9, endHour: 12 },
  { startHour: 14, endHour: 18 },
] as const;

export type DeepSeekPeakStatus = {
  isPeak: boolean;
  nepalEndTime: string | null;
  nepalTime: string;
};

const formatNepalTime = (date: Date, locale?: string) =>
  `${new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(date)} NPT`;

export const getDeepSeekPeakStatus = (
  now: Date = new Date(),
  locale?: string,
): DeepSeekPeakStatus => {
  const beijingClock = new Date(
    now.getTime() + BEIJING_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
  const beijingMinutes =
    beijingClock.getUTCHours() * 60 + beijingClock.getUTCMinutes();
  const activeWindow = DEEPSEEK_PEAK_WINDOWS.find(
    ({ startHour, endHour }) =>
      beijingMinutes >= startHour * 60 && beijingMinutes < endHour * 60,
  );

  const endTime = activeWindow
    ? new Date(
      Date.UTC(
        beijingClock.getUTCFullYear(),
        beijingClock.getUTCMonth(),
        beijingClock.getUTCDate(),
        activeWindow.endHour - BEIJING_UTC_OFFSET_HOURS,
      ),
    )
    : null;

  return {
    isPeak: Boolean(activeWindow),
    nepalEndTime: endTime ? formatNepalTime(endTime, locale) : null,
    nepalTime: formatNepalTime(now, locale),
  };
};
