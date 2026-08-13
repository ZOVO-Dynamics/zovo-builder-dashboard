export function addOneMonth(referenceStart: Date): Date {
  const end = new Date(referenceStart);
  end.setMonth(end.getMonth() + 1);
  return end;
}
