export function extractNoticeMessage(notice: unknown): string | null {
  if (!notice) return null;
  if (typeof notice === "string") {
    const trimmed = notice.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof notice === "object" && notice !== null) {
    const obj = notice as Record<string, unknown>;
    const candidates = [obj.message, obj.reason, obj.description, obj.note, obj.title];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return null;
}
