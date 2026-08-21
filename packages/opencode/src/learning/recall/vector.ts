export function cosine(a: readonly number[], b: readonly number[]) {
  if (!a.length || a.length !== b.length) return 0
  let dot = 0
  let aa = 0
  let bb = 0
  for (let index = 0; index < a.length; index++) {
    dot += a[index]! * b[index]!
    aa += a[index]! * a[index]!
    bb += b[index]! * b[index]!
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0
}
