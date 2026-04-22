// Zeus / MedCloud brand palette — cyan primary, grayscale neutrals.
// Shared across every flow in the converter so the two paths can't drift
// in color on their own.
export const BRAND = {
  cyan: '#00B5D6',
  cyanLight: '#D6EBF2',
  cyanMid: '#68D1E6',
  cyanSoft: '#A1DEED',
  grayLight: '#E6E6E6',
  grayMid: '#CCCCCC',
  grayDark: '#616161',
  black: '#000000',
  surface: '#F5F7F8',
  white: '#FFFFFF',
  danger: '#D8332E',
  warning: '#C57300',
};

// Height bounds for the resizable table. These drive both the clamp logic
// in the flow components and the ARIA valuemin/valuemax on the resize
// separator, so keeping them in one place prevents drift between the two.
export const TABLE_HEIGHT_MIN = 240;
export const TABLE_HEIGHT_MAX = 1400;
