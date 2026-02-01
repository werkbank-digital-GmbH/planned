/**
 * User Matching Service
 *
 * Matcht planned. Users mit Asana Users anhand des E-Mail-Prefixes.
 * Dies ermöglicht das Mapping auch wenn die E-Mail-Domains unterschiedlich sind.
 *
 * Beispiel: j.mischke@holzbau.de === j.mischke@holzbau.com
 */

export interface PlannedUserForMatching {
  id: string;
  email: string;
}

export interface AsanaUserForMatching {
  gid: string;
  email: string;
  name: string;
}

export interface UserMatchResult {
  plannedUserId: string;
  plannedUserEmail: string;
  asanaUserGid: string;
  asanaUserEmail: string;
  asanaUserName: string;
}

export interface UserMatchSummary {
  matched: UserMatchResult[];
  unmatchedPlanned: PlannedUserForMatching[];
  unmatchedAsana: AsanaUserForMatching[];
}

/**
 * Extrahiert den Prefix einer E-Mail-Adresse (Teil vor dem @).
 * Normalisiert zu Kleinbuchstaben für case-insensitiven Vergleich.
 */
function getEmailPrefix(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    return email.toLowerCase();
  }
  return email.substring(0, atIndex).toLowerCase();
}

/**
 * Matcht Users per E-Mail-Prefix (vor dem @).
 *
 * @param plannedUsers - Liste der planned. Users
 * @param asanaUsers - Liste der Asana Users
 * @returns Summary mit gematchten und nicht-gematchten Users
 */
export function matchUsersByEmailPrefix(
  plannedUsers: PlannedUserForMatching[],
  asanaUsers: AsanaUserForMatching[]
): UserMatchSummary {
  // Index Asana Users nach E-Mail-Prefix
  const asanaByPrefix = new Map<string, AsanaUserForMatching>();
  for (const asanaUser of asanaUsers) {
    if (asanaUser.email) {
      const prefix = getEmailPrefix(asanaUser.email);
      asanaByPrefix.set(prefix, asanaUser);
    }
  }

  const matched: UserMatchResult[] = [];
  const unmatchedPlanned: PlannedUserForMatching[] = [];
  const matchedAsanaGids = new Set<string>();

  // Versuche jeden planned User zu matchen
  for (const plannedUser of plannedUsers) {
    const prefix = getEmailPrefix(plannedUser.email);
    const asanaUser = asanaByPrefix.get(prefix);

    if (asanaUser) {
      matched.push({
        plannedUserId: plannedUser.id,
        plannedUserEmail: plannedUser.email,
        asanaUserGid: asanaUser.gid,
        asanaUserEmail: asanaUser.email,
        asanaUserName: asanaUser.name,
      });
      matchedAsanaGids.add(asanaUser.gid);
    } else {
      unmatchedPlanned.push(plannedUser);
    }
  }

  // Finde nicht-gematchte Asana Users
  const unmatchedAsana = asanaUsers.filter(
    (u) => !matchedAsanaGids.has(u.gid)
  );

  return {
    matched,
    unmatchedPlanned,
    unmatchedAsana,
  };
}
