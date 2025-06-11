interface UsageMetric {
  timestamp: string;
  action: string;
  category: string;
  details?: any;
}

interface AnalyticsData {
  usageMetrics: UsageMetric[];
  dailyStats: {
    [date: string]: {
      totalActions: number;
      categories: { [category: string]: number };
    };
  };
  categoryStats: {
    [category: string]: {
      total: number;
      lastUsed: string;
    };
  };
}

class OfflineAnalyticsService {
  private static instance: OfflineAnalyticsService;
  private readonly STORAGE_KEY = 'offline_analytics';

  private constructor() {
    this.initializeAnalytics();
  }

  static getInstance(): OfflineAnalyticsService {
    if (!OfflineAnalyticsService.instance) {
      OfflineAnalyticsService.instance = new OfflineAnalyticsService();
    }
    return OfflineAnalyticsService.instance;
  }

  private initializeAnalytics(): void {
    const existingData = localStorage.getItem(this.STORAGE_KEY);
    if (!existingData) {
      const initialData: AnalyticsData = {
        usageMetrics: [],
        dailyStats: {},
        categoryStats: {}
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialData));
    }
  }

  private getAnalyticsData(): AnalyticsData {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : this.initializeAnalytics();
  }

  private saveAnalyticsData(data: AnalyticsData): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  trackAction(action: string, category: string, details?: any): void {
    const data = this.getAnalyticsData();
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];

    // Add usage metric
    data.usageMetrics.push({
      timestamp,
      action,
      category,
      details
    });

    // Update daily stats
    if (!data.dailyStats[date]) {
      data.dailyStats[date] = {
        totalActions: 0,
        categories: {}
      };
    }
    data.dailyStats[date].totalActions++;
    data.dailyStats[date].categories[category] = (data.dailyStats[date].categories[category] || 0) + 1;

    // Update category stats
    if (!data.categoryStats[category]) {
      data.categoryStats[category] = {
        total: 0,
        lastUsed: timestamp
      };
    }
    data.categoryStats[category].total++;
    data.categoryStats[category].lastUsed = timestamp;

    // Keep only last 30 days of metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    data.usageMetrics = data.usageMetrics.filter(metric => 
      new Date(metric.timestamp) > thirtyDaysAgo
    );

    this.saveAnalyticsData(data);
  }

  getUsageMetrics(days: number = 7): UsageMetric[] {
    const data = this.getAnalyticsData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return data.usageMetrics.filter(metric => 
      new Date(metric.timestamp) > cutoffDate
    );
  }

  getDailyStats(days: number = 7): { [date: string]: any } {
    const data = this.getAnalyticsData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Object.entries(data.dailyStats)
      .filter(([date]) => new Date(date) > cutoffDate)
      .reduce((acc, [date, stats]) => {
        acc[date] = stats;
        return acc;
      }, {} as { [date: string]: any });
  }

  getCategoryStats(): { [category: string]: any } {
    return this.getAnalyticsData().categoryStats;
  }

  generateReport(): string {
    const data = this.getAnalyticsData();
    const report = {
      generatedAt: new Date().toISOString(),
      totalActions: data.usageMetrics.length,
      dailyStats: data.dailyStats,
      categoryStats: data.categoryStats,
      topCategories: Object.entries(data.categoryStats)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 5)
        .map(([category, stats]) => ({
          category,
          total: stats.total,
          lastUsed: stats.lastUsed
        }))
    };

    return JSON.stringify(report, null, 2);
  }

  exportReport(): void {
    const report = this.generateReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearAnalytics(): void {
    this.initializeAnalytics();
  }
}

export default OfflineAnalyticsService; 