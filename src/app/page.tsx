import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Skeleton className="h-12 w-1/2" />
    </div>
  );
}
