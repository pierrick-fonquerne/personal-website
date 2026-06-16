/** One subtheme of a theme group, with its number of published courses. */
export interface CourseGroupSubtheme {
  sub: string;
  subLabel: string;
  courseCount: number;
}

/** A theme group as displayed on the courses index, before nav transformation. */
export interface CourseGroup {
  theme: string;
  themeLabel: string;
  subthemes: CourseGroupSubtheme[];
}

/** A subtheme entry in the side rail, pointing to its in-page anchor. */
export interface CourseNavSubtheme {
  sub: string;
  label: string;
  anchorId: string;
}

/** A theme entry in the side rail: anchor, total course count, subthemes. */
export interface CourseNavTheme {
  theme: string;
  label: string;
  anchorId: string;
  count: number;
  subthemes: CourseNavSubtheme[];
}

/**
 * Builds the side rail navigation model from the theme groups rendered on the
 * courses index. Anchor ids mirror the ids emitted in the page markup
 * (`theme-<theme>` and `sub-<sub>`).
 */
export function buildCourseNav(groups: CourseGroup[]): CourseNavTheme[] {
  return groups.map((group) => ({
    theme: group.theme,
    label: group.themeLabel,
    anchorId: `theme-${group.theme}`,
    count: group.subthemes.reduce((total, subtheme) => total + subtheme.courseCount, 0),
    subthemes: group.subthemes.map((subtheme) => ({
      sub: subtheme.sub,
      label: subtheme.subLabel,
      anchorId: `sub-${subtheme.sub}`,
    })),
  }));
}
