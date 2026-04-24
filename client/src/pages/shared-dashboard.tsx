import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Lock,
} from "lucide-react";
import type { Dashboard, Dataset, ChartConfig } from "@shared/schema";

interface SharedDashboardProps {
  shareToken: string;
}

const CHART_COLORS = [
  "hsl(43, 74%, 49%)",
  "hsl(200, 65%, 38%)",
  "hsl(280, 55%, 42%)",
  "hsl(25, 70%, 45%)",
  "hsl(160, 60%, 40%)",
];

interface SharedApiResponse {
  dashboard: Dashboard;
  dataset: Dataset | null;
}

export default function SharedDashboard({ shareToken }: SharedDashboardProps) {
  const { data: response, isLoading, error } = useQuery<SharedApiResponse>({
    queryKey: ["/api/shared", shareToken],
  });

  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (error || !response || !response.dashboard) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="p-12 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-serif text-2xl font-bold mb-2">Dashboard Not Found</h1>
            <p className="text-muted-foreground">
              This dashboard may have been deleted or the link is invalid.
            </p>
          </Card>
        </div>
      </ThemeProvider>
    );
  }

  const dashboard = response.dashboard;
  const dataset = response.dataset;
  const config = dashboard.config as { charts?: ChartConfig[]; summary?: string } | null;
  const data = dataset?.data || [];
  
  // Handle case where config or charts is missing
  if (!config || !config.charts || !Array.isArray(config.charts)) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="p-12 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-serif text-2xl font-bold mb-2">No Charts Configured</h1>
            <p className="text-muted-foreground">
              This dashboard doesn't have any charts configured yet.
            </p>
          </Card>
        </div>
      </ThemeProvider>
    );
  }

  const kpis = config.charts.filter((c) => c.type === "kpi");
  const charts = config.charts.filter((c) => c.type !== "kpi");

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg font-bold">DataInsights</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <h1 className="font-serif text-2xl font-bold">{dashboard.title}</h1>
            {dashboard.description && (
              <p className="text-muted-foreground mt-1">{dashboard.description}</p>
            )}
          </div>

          {/* AI Summary - Min 4 lines */}
          {config.summary && (
            <Card className="p-4 bg-primary/5 border-primary/20 min-h-[120px] max-h-48 overflow-y-auto">
              <div className="text-sm leading-relaxed">
                <span className="font-medium text-amber-500">AI Insights: </span>
                <span className="whitespace-pre-line">{config.summary}</span>
              </div>
            </Card>
          )}

          {/* KPI Cards */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => (
                <SharedKPICard key={kpi.id} config={kpi} data={data} index={i} />
              ))}
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {charts.map((chart, i) => (
              <SharedChartCard key={chart.id} config={chart} data={data} index={i} />
            ))}
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold">DataInsights</span>
            </p>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

function SharedKPICard({ config, data, index }: { config: ChartConfig; data: any[]; index: number }) {
  const values = data.map((row) => parseFloat(row[config.dataKey]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const average = values.length > 0 ? total / values.length : 0;
  const displayValue = config.insights?.includes("average") ? average : total;
  const formattedValue = displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const midpoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint || 0;
  const secondHalf = values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint) || 0;
  const trend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{config.title}</p>
        <p className="text-2xl font-bold" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
          {formattedValue}
        </p>
        {values.length > 1 && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend).toFixed(1)}% vs previous</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function SharedChartCard({ config, data, index }: { config: ChartConfig; data: any[]; index: number }) {
  const chartData = data.slice(0, 20).map((row) => ({
    name: row[config.labelKey || Object.keys(row)[0]] || "Unknown",
    value: parseFloat(row[config.dataKey]) || 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
    >
      <Card className="p-6">
        <h3 className="font-semibold mb-4">{config.title}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {config.type === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }} 
                />
                <Bar dataKey="value" fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : config.type === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                  strokeWidth={2}
                />
              </LineChart>
            ) : config.type === "pie" ? (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <div className="h-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-right py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2">{row.name}</td>
                        <td className="text-right py-2">{row.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ResponsiveContainer>
        </div>
        {config.insights && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
            {config.insights}
          </p>
        )}
      </Card>
    </motion.div>
  );
}
