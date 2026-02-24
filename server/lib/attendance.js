/**
 * Attendance rule: mark present only if workout info exists
 * (done sets, or set weight/reps, or rpe/duration/notes).
 */
export function hasWorkoutInfo(session) {
  if (!session) return false;
  if (session.rpe && session.rpe.trim() !== "") return true;
  if (session.duration && session.duration.trim() !== "") return true;
  if (session.notes && session.notes.trim() !== "") return true;
  const exercises = session.exercises || [];
  for (const ex of exercises) {
    const sets = ex.sets_data || [];
    for (const s of sets) {
      if (s.done) return true;
      if (s.weight && String(s.weight).trim() !== "") return true;
      if (s.reps && String(s.reps).trim() !== "") return true;
    }
  }
  return false;
}

export function countEvidence(session) {
  let n = 0;
  if (session.rpe && session.rpe.trim() !== "") n++;
  if (session.duration && session.duration.trim() !== "") n++;
  if (session.notes && session.notes.trim() !== "") n++;
  const exercises = session.exercises || [];
  for (const ex of exercises) {
    const sets = ex.sets_data || [];
    for (const s of sets) {
      if (s.done || (s.weight && String(s.weight).trim() !== "") || (s.reps && String(s.reps).trim() !== "")) n++;
    }
  }
  return n;
}
