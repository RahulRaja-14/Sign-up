import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, BarChart, BookOpen, Target } from "lucide-react";

export default function DashboardPage() {
  const cards = [
    { title: "Total Sessions", value: "1,234", icon: Activity },
    { title: "Interview Score", value: "8.5/10", icon: Target },
    { title: "Practice Hours", value: "48h", icon: BarChart },
    { title: "Modules Completed", value: "12/20", icon: BookOpen },
  ];

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index} className="bg-card hover:border-primary/50 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
             <div className="h-[350px] bg-secondary rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Chart Placeholder</p>
             </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[350px] bg-secondary rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Activity Feed Placeholder</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
