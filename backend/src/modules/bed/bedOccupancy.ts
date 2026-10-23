/** Shared bed occupancy lifecycle logic used by admission and encounter workflows. */
export const releaseBedForAttendance = async (
  tx: any,
  attendance: { id: string; bedId?: string | null },
): Promise<void> => {
  if (!attendance.bedId) return;

  const otherActiveAssignment = await tx.attendance.findFirst({
    where: { id: { not: attendance.id }, bedId: attendance.bedId, status: { in: ['pending', 'admitted'] } },
    select: { id: true },
  });
  if (otherActiveAssignment) return;

  const bed = await tx.bed.findUnique({
    where: { id: attendance.bedId },
    select: { id: true, wardId: true, isOccupied: true },
  });
  if (!bed || !bed.isOccupied) return;

  await tx.bed.update({ where: { id: bed.id }, data: { isOccupied: false } });
  await tx.ward.updateMany({
    where: { id: bed.wardId, occupiedBeds: { gt: 0 } },
    data: { occupiedBeds: { decrement: 1 } },
  });
};
