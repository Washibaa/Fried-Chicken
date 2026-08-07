// Which pending leave requests belong in a given staff member's queue.
//
// A request is routed to exactly one authority by its length (SRS 3.1.2):
// 1 day -> the Class Monitor, up to 2 days -> a Teacher, longer -> Head of
// Dept. A teacher must not be shown the ones routed to a monitor, or their
// queue and their counters disagree with each other.
//
// This lives in one place because the rule is applied in three: the Leave
// page, the dashboard card, and the sidebar badge.

// PostgREST `.or()` syntax. `routed_to.is.null` keeps rows recorded before
// routing existed visible rather than stranding them with no reviewer.
//
// A teacher covers their own level AND the monitor's: a class monitor may be
// away or not appointed, and a 1-day request shouldn't sit unanswered because
// of it. Requests routed to 'admin' (longer than 2 days) still escalate to the
// Head of Dept and stay out of a teacher's queue.
//
// The database already permits this — "staff decide leave" authorises any
// request from a student in the teacher's classes, with no routing condition —
// so this filter is purely about what's worth showing them.
const TEACHER_SCOPE = 'routed_to.eq.teacher,routed_to.eq.monitor,routed_to.is.null'

/**
 * The `.or()` filter to apply for this role, or null to apply none.
 * Admins / Head of Dept can decide anything, so they get no filter.
 */
export function leaveScopeFor(role: string | null | undefined): string | null {
  return role === 'teacher' ? TEACHER_SCOPE : null
}

/** Same rule, for filtering rows already in memory. */
export function isLeaveInScope(
  role: string | null | undefined,
  routedTo: string | null | undefined
): boolean {
  if (role !== 'teacher') return true
  return routedTo === 'teacher' || routedTo === 'monitor' || routedTo == null
}
