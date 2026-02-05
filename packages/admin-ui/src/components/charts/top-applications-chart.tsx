'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface TopApplication {
  applicationId: string;
  applicationName: string;
  eventCount: number;
}

interface TopApplicationsChartProps {
  data: TopApplication[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(160 60% 45%)',
  'hsl(200 80% 50%)',
  'hsl(280 60% 55%)',
];

export function TopApplicationsChart({ data, isLoading }: TopApplicationsChartProps) {
  if (isLoading) {
    return (
      <div className="h-[250px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] w-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-sm">No application data available</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Events will appear here once webhooks are triggered
        </p>
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    name: item.applicationName.length > 15
      ? `${item.applicationName.slice(0, 15)}...`
      : item.applicationName,
    fullName: item.applicationName,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            type="number"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
            formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value, 'Events']}
            labelFormatter={(_, payload) => {
              if (payload && payload.length > 0) {
                return payload[0].payload.fullName;
              }
              return '';
            }}
          />
          <Bar
            dataKey="eventCount"
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
