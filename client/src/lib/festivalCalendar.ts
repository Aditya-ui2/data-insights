export interface Festival {
  name: string;
  date: string; // YYYY-MM-DD (for current/next FY)
  emoji: string;
  type: "major" | "regional" | "business";
  tip?: string;
}

function fy(month: number, day: number, forYear?: number): string {
  const now = new Date();
  // Indian FY: April–March
  // FY 2025-26 starts April 1 2025, ends March 31 2026
  const fyStartYear = forYear ?? (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  const calYear = month >= 4 ? fyStartYear : fyStartYear + 1;
  return `${calYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getFestivals(forFyStartYear?: number): Festival[] {
  const festivals: Festival[] = [
    { name: "Gudi Padwa / Ugadi", date: fy(3, 30, forFyStartYear), emoji: "🪔", type: "major" as const, tip: "New Year for many businesses — great time to launch offers" },
    { name: "Indian New Financial Year", date: fy(4, 1, forFyStartYear), emoji: "📅", type: "business" as const, tip: "Set targets and review last year's performance" },
    { name: "Akshaya Tritiya", date: fy(5, 10, forFyStartYear), emoji: "✨", type: "major" as const, tip: "Auspicious for gold & jewellery sales; premium launches work well" },
    { name: "Eid al-Adha", date: fy(6, 7, forFyStartYear), emoji: "🌙", type: "major" as const, tip: "High demand in food, clothing, and gifting categories" },
    { name: "Independence Day", date: fy(8, 15, forFyStartYear), emoji: "🇮🇳", type: "major" as const, tip: "Patriotic campaigns and sale events drive strong traffic" },
    { name: "Onam", date: fy(9, 5, forFyStartYear), emoji: "🌸", type: "regional" as const, tip: "Peak retail season in Kerala; great for consumer electronics & gifts" },
    { name: "Navratri Begins", date: fy(10, 3, forFyStartYear), emoji: "🎺", type: "major" as const, tip: "9-day peak season — stock up on festive inventory" },
    { name: "Dussehra", date: fy(10, 12, forFyStartYear), emoji: "🏹", type: "major" as const, tip: "Vehicle and electronics launches perform well" },
    { name: "Dhanteras", date: fy(10, 29, forFyStartYear), emoji: "💰", type: "major" as const, tip: "Highest gold & silver buying day — ideal for premium products" },
    { name: "Diwali", date: fy(10, 31, forFyStartYear), emoji: "🪔", type: "major" as const, tip: "India's biggest shopping festival — plan inventory 4 weeks early" },
    { name: "Bhai Dooj", date: fy(11, 2, forFyStartYear), emoji: "🎁", type: "major" as const, tip: "Gifting and sweets peak — offer combo gift packs" },
    { name: "Guru Nanak Jayanti", date: fy(11, 15, forFyStartYear), emoji: "🙏", type: "major" as const, tip: "Community engagement and charitable initiatives resonate" },
    { name: "Christmas", date: fy(12, 25, forFyStartYear), emoji: "🎄", type: "major" as const, tip: "Hospitality, retail and e-commerce see year-end boost" },
    { name: "New Year's Day", date: fy(1, 1, forFyStartYear), emoji: "🎆", type: "major" as const, tip: "Fresh start — launch new year campaigns and reset targets" },
    { name: "Pongal / Makar Sankranti", date: fy(1, 14, forFyStartYear), emoji: "🌾", type: "major" as const, tip: "Harvest season — agriculture, food, and rural retail peak" },
    { name: "Republic Day", date: fy(1, 26, forFyStartYear), emoji: "🇮🇳", type: "major" as const, tip: "National sale events and patriotic messaging work well" },
    { name: "Valentine's Day", date: fy(2, 14, forFyStartYear), emoji: "❤️", type: "business" as const, tip: "High demand for gifts, dining, and experiences" },
    { name: "Holi", date: fy(3, 14, forFyStartYear), emoji: "🎨", type: "major" as const, tip: "Vibrant season — colours, food, and clothing see high demand" },
    { name: "Financial Year End", date: fy(3, 31, forFyStartYear), emoji: "📊", type: "business" as const, tip: "Last chance for tax-saving purchases and year-end clearance" },
  ];
  return festivals.sort((a, b) => a.date.localeCompare(b.date));
}

export interface UpcomingFestival {
  festival: Festival;
  daysAway: number;
}

export function getUpcomingFestivals(withinDays = 30, today?: Date): UpcomingFestival[] {
  const now = today ?? new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Check both current FY and next FY festivals
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const festivals = [
    ...getFestivals(fyStartYear),
    ...getFestivals(fyStartYear + 1),
  ];

  return festivals
    .map((f) => {
      const diff = Math.round(
        (new Date(f.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { festival: f, daysAway: diff };
    })
    .filter(({ daysAway }) => daysAway >= 0 && daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}

export function getCurrentFY(today?: Date): { label: string; startYear: number; endYear: number; monthInFY: number } {
  const now = today ?? new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const monthInFY = month >= 4 ? month - 3 : month + 9; // April=1, March=12
  return {
    label: `FY ${startYear}-${String(endYear).slice(2)}`,
    startYear,
    endYear,
    monthInFY,
  };
}

export function getFYDateRange(fyStartYear?: number): { from: string; to: string } {
  const fy = fyStartYear ?? getCurrentFY().startYear;
  return {
    from: `${fy}-04-01`,
    to: `${fy + 1}-03-31`,
  };
}
