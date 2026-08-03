export type ChartPoint = [number, number | null];

interface PreparedLineSeries {
  points: ChartPoint[];
  discontinuities: number[];
}

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const estimateAsymptote = (left: ChartPoint, right: ChartPoint) => {
  const [leftX, leftY] = left;
  const [rightX, rightY] = right;
  if (leftY === null || rightY === null || leftY === 0 || rightY === 0) {
    return (leftX + rightX) / 2;
  }
  const leftReciprocal = 1 / leftY;
  const rightReciprocal = 1 / rightY;
  const denominator = rightReciprocal - leftReciprocal;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-12) {
    return (leftX + rightX) / 2;
  }
  const estimated = leftX - leftReciprocal * (rightX - leftX) / denominator;
  return Math.min(Math.max(estimated, Math.min(leftX, rightX)), Math.max(leftX, rightX));
};

export const prepareLineSeries = (
  points: ChartPoint[],
  yMin: number | null,
  yMax: number | null,
): PreparedLineSeries => {
  const adjacentDeltas: number[] = [];
  const finiteValues: number[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const value = points[index][1];
    if (value !== null) finiteValues.push(value);
    if (index === 0 || value === null || points[index - 1][1] === null) continue;
    adjacentDeltas.push(Math.abs(value - (points[index - 1][1] as number)));
  }

  const sortedValues = [...finiteValues].sort((a, b) => a - b);
  const lowerValue = sortedValues[Math.floor((sortedValues.length - 1) * 0.1)] ?? -1;
  const upperValue = sortedValues[Math.floor((sortedValues.length - 1) * 0.9)] ?? 1;
  const visibleSpan = yMin !== null && yMax !== null
    ? Math.abs(yMax - yMin)
    : Math.max(Math.abs(upperValue - lowerValue), 1);
  const jumpThreshold = Math.max(median(adjacentDeltas) * 10, Math.min(visibleSpan * 0.75, 10), 4);
  const preparedPoints: ChartPoint[] = [];
  const discontinuities: number[] = [];

  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous && previous[1] !== null && point[1] !== null) {
      const jump = Math.abs(point[1] - previous[1]);
      const changesSign = previous[1] * point[1] < 0;
      if (changesSign && jump > jumpThreshold) {
        const x = Number(estimateAsymptote(previous, point).toPrecision(12));
        preparedPoints.push([x, null]);
        discontinuities.push(x);
      }
    }

    if (point[1] === null) {
      const before = points[index - 1]?.[1];
      const after = points[index + 1]?.[1];
      if (before !== null && before !== undefined && after !== null && after !== undefined
        && Math.abs(before) + Math.abs(after) > jumpThreshold) {
        discontinuities.push(point[0]);
      }
    }
    preparedPoints.push(point);
  });

  return {
    points: preparedPoints,
    discontinuities: discontinuities.filter((value, index) => (
      index === 0 || Math.abs(value - discontinuities[index - 1]) > 1e-6
    )),
  };
};
