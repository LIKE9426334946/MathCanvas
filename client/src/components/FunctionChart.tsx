import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { AlertTriangle } from 'lucide-react';
import { prepareLineSeries } from '../lib/chartSeries';
import { buildSeries } from '../lib/expressionEngine';
import type { FunctionConfig, ParameterValues } from '../types';

interface FunctionChartProps {
  config: FunctionConfig;
  values: ParameterValues;
  compact?: boolean;
}

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const formatNumber = (value: number | null | undefined) => {
  if (!isFiniteNumber(value)) return '未定义';
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(2);
  return Number(value.toFixed(4)).toString();
};

const formatCoordinate = (value: number | null | undefined) => (
  isFiniteNumber(value) ? Number(value.toFixed(1)).toString() : '未定义'
);

export const FunctionChart = ({ config, values, compact = false }: FunctionChartProps) => {
  const isDark = document.documentElement.classList.contains('dark');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateLayout = () => setIsMobile(media.matches);
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const result = useMemo(() => {
    try {
      const points = buildSeries(config, values);
      const prepared = config.chartType === 'line'
        ? prepareLineSeries(points, config.yMin, config.yMax)
        : { points, discontinuities: [] };
      return { ...prepared, error: '' };
    } catch (caught) {
      return { points: [], discontinuities: [], error: caught instanceof Error ? caught.message : '表达式无法解析' };
    }
  }, [config, values]);

  const option = useMemo(() => ({
    animationDuration: 220,
    animationEasing: 'cubicOut',
    grid: {
      left: compact ? 46 : isMobile ? 44 : 56,
      right: compact ? 18 : isMobile ? 10 : 28,
      top: compact ? 22 : isMobile ? 14 : 28,
      bottom: compact ? 38 : isMobile ? 34 : 48,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      enterable: false,
      hideDelay: 0,
      position: (
        point: [number, number],
        _parameters: unknown,
        _element: HTMLElement,
        _rect: unknown,
        size: { contentSize: [number, number]; viewSize: [number, number] },
      ) => {
        const horizontalPadding = 8;
        const centeredLeft = point[0] - size.contentSize[0] / 2;
        const maximumLeft = size.viewSize[0] - size.contentSize[0] - horizontalPadding;
        return [Math.max(horizontalPadding, Math.min(centeredLeft, maximumLeft)), 8];
      },
      backgroundColor: isDark ? '#252338' : '#ffffff',
      borderColor: isDark ? '#3a3751' : '#e2e8f0',
      textStyle: { color: isDark ? '#f8fafc' : '#0f172a', fontSize: 12 },
      formatter: (items: Array<{ value: [number, number | null] }>) => {
        const item = items[0];
        if (!item || !Array.isArray(item.value)) return '';

        const [x, y] = item.value;
        return isFiniteNumber(y)
          ? `x = ${formatCoordinate(x)}<br/><strong>f(x) = ${formatNumber(y)}</strong>`
          : `x = ${formatCoordinate(x)}<br/><strong>f(x) 未定义</strong>`;
      },
    },
    xAxis: {
      type: 'value',
      min: config.xMin,
      max: config.xMax,
      axisLine: { lineStyle: { color: isDark ? '#625e78' : '#94a3b8' } },
      axisTick: { show: false },
      axisLabel: { color: isDark ? '#9f9bb1' : '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,.07)' : 'rgba(100,116,139,.12)' } },
    },
    yAxis: {
      type: 'value',
      ...(config.yMin !== null ? { min: config.yMin } : {}),
      ...(config.yMax !== null ? { max: config.yMax } : {}),
      axisLine: { show: true, lineStyle: { color: isDark ? '#625e78' : '#94a3b8' } },
      axisTick: { show: false },
      axisLabel: { color: isDark ? '#9f9bb1' : '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,.07)' : 'rgba(100,116,139,.12)' } },
    },
    series: [{
      type: config.chartType,
      data: result.points,
      showSymbol: config.chartType === 'bar',
      symbolSize: 5,
      connectNulls: false,
      sampling: config.chartType === 'line' ? 'lttb' : undefined,
      lineStyle: { width: 3, color: '#7066e8', cap: 'round' },
      itemStyle: { color: '#7066e8', borderRadius: config.chartType === 'bar' ? [5, 5, 0, 0] : 0 },
      areaStyle: config.chartType === 'line' ? {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: isDark ? 'rgba(112,102,232,.32)' : 'rgba(112,102,232,.24)' },
            { offset: 1, color: 'rgba(112,102,232,0)' },
          ],
        },
      } : undefined,
      barMaxWidth: 26,
      markLine: config.chartType === 'line' && result.discontinuities.length > 0 ? {
        silent: true,
        symbol: 'none',
        label: { show: false },
        lineStyle: {
          color: isDark ? 'rgba(203, 213, 225, .32)' : 'rgba(100, 116, 139, .35)',
          type: 'dashed',
          width: 1.25,
        },
        data: result.discontinuities.map((x) => ({ xAxis: x })),
      } : undefined,
    }],
  }), [compact, config, isDark, isMobile, result.discontinuities, result.points]);

  if (result.error) {
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-2xl bg-rose-50 px-6 text-center text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
        <div>
          <AlertTriangle className="mx-auto mb-3" />
          <p className="font-semibold">表达式暂时无法绘制</p>
          <p className="mt-1 text-sm opacity-80">{result.error}</p>
        </div>
      </div>
    );
  }

  return <ReactECharts option={option} notMerge lazyUpdate style={{ height: compact ? 300 : isMobile ? 310 : 390, width: '100%' }} />;
};
