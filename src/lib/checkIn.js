const MOTIVATION_LOW_THRESHOLD = 4;
const MOTIVATION_CONSISTENT_COUNT = 3;

/**
 * @param {Object} checkIn - { sleep, soreness, mood, motivation, painYesNo, painArea? }
 * @param {Array} recentSessions - last N sessions that may have checkIn.motivation
 * @returns {string[]} recommendation messages
 */
export function getCheckInRecommendations(checkIn, recentSessions = []) {
  const r = [];
  if (checkIn.sleep != null && checkIn.sleep < 6) {
    r.push("Reduce session intensity by 10–15%");
  }
  if (checkIn.soreness != null && checkIn.soreness > 7) {
    r.push("Substitute heavy compounds with lighter accessory work");
  }
  if (checkIn.mood != null && checkIn.mood < 5) {
    r.push("Talk to coach — stress outside the gym can affect adaptation");
  }
  const previousMotivations = recentSessions
    .map(s => s.checkIn?.motivation)
    .filter(m => m != null)
    .slice(0, MOTIVATION_CONSISTENT_COUNT - 1);
  const motivations = [checkIn.motivation, ...previousMotivations];
  if (motivations.length >= MOTIVATION_CONSISTENT_COUNT && motivations.every(m => Number(m) <= MOTIVATION_LOW_THRESHOLD)) {
    r.push("Consistent low motivation — consider a rest day");
  }
  if (checkIn.painYesNo) {
    r.push("Any joint pain: stop that exercise immediately — coach must investigate" + (checkIn.painArea ? ` (${checkIn.painArea})` : ""));
  }
  return r;
}

/**
 * @param {Object} values - form values
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCheckIn(values) {
  const { sleep, soreness, mood, motivation, painYesNo } = values;
  if (sleep === "" || sleep == null) return { valid: false, error: "Rate your sleep (1–10)." };
  if (soreness === "" || soreness == null) return { valid: false, error: "Rate your soreness (1–10)." };
  if (mood === "" || mood == null) return { valid: false, error: "Rate your mood/energy (1–10)." };
  if (motivation === "" || motivation == null) return { valid: false, error: "Rate your motivation (1–10)." };
  if (painYesNo !== true && painYesNo !== false) return { valid: false, error: "Answer yes or no for pain/soreness." };
  const s = Number(sleep), so = Number(soreness), m = Number(mood), mo = Number(motivation);
  if (s < 1 || s > 10 || so < 1 || so > 10 || m < 1 || m > 10 || mo < 1 || mo > 10) {
    return { valid: false, error: "All scales must be between 1 and 10." };
  }
  return { valid: true };
}
