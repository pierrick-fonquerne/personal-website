/**
 * Compute someone's age in full years on a reference date.
 * Used to surface Pierrick's age without storing his exact birthdate elsewhere.
 */
export function computeAge(birthdate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthdate.getFullYear();
  const monthDiff = now.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthdate.getDate())) {
    age -= 1;
  }
  return age;
}
