"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";

type MetricCard = {
  title: string;
  value: number;
  color: string;
  bgColor: string;
  textColor: string;
};

export function MaintenanceMetrics() {
  const [metrics, setMetrics] = useState<MetricCard[]>([
    { title: "Críticas", value: 0, color: "bg-gradient-to-r from-red-500 to-red-600", bgColor: "bg-gradient-to-r from-red-400 to-red-500", textColor: "text-white" },
    { title: "Atención", value: 0, color: "bg-gradient-to-r from-yellow-500 to-yellow-600", bgColor: "bg-gradient-to-r from-yellow-400 to-yellow-500", textColor: "text-white" },
    { title: "Total Alertas", value: 0, color: "bg-gradient-to-r from-blue-500 to-blue-600", bgColor: "bg-gradient-to-r from-blue-400 to-blue-500", textColor: "text-white" }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(`/api/maintenance/alerts`);
        const alerts = response.data;
        
        const criticalCount = alerts.filter((alert: { state: string }) => alert.state === "RED").length;
        const warningCount = alerts.filter((alert: { state: string }) => alert.state === "YELLOW").length;
        const totalCount = alerts.length;

        setMetrics([
          { 
            title: "Críticas", 
            value: criticalCount, 
            color: "bg-gradient-to-r from-red-500 to-red-600", 
            bgColor: "bg-gradient-to-r from-red-400 to-red-500", 
            textColor: "text-white" 
          },
          { 
            title: "Atención", 
            value: warningCount, 
            color: "bg-gradient-to-r from-yellow-500 to-yellow-600", 
            bgColor: "bg-gradient-to-r from-yellow-400 to-yellow-500", 
            textColor: "text-white" 
          },
          { 
            title: "Total Alertas", 
            value: totalCount, 
            color: "bg-gradient-to-r from-blue-500 to-blue-600", 
            bgColor: "bg-gradient-to-r from-blue-400 to-blue-500", 
            textColor: "text-white" 
          }
        ]);
      } catch (error) {
        console.error("Error fetching maintenance metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <CardContent className="flex items-center justify-between p-0">
              <div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              </div>
              <div className="w-3 h-12 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className={`p-0 border-0 shadow-lg overflow-hidden`}>
          <div className={`${metric.bgColor} p-6`}>
            <CardContent className="flex items-center justify-between p-0">
              <div>
                <p className={`text-sm font-medium ${metric.textColor} opacity-90`}>
                  {metric.title}
                </p>
                <p className={`text-4xl font-bold ${metric.textColor}`}>
                  {metric.value}
                </p>
              </div>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
}