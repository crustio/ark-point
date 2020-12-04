/**
 * Parse object into JSON object
 * @param o any object
 */
export function parseObj(o: any) {
  return JSON.parse(JSON.stringify(o));
}
