import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const COMMON_RANGES = [
  { label: "Today", minutes: 24 * 60 },
  { label: "This week", minutes: 7 * 24 * 60 },
  { label: "Last 1 minute", minutes: 1 },
  { label: "Last 15 minutes", minutes: 15 },
  { label: "Last 30 minutes", minutes: 30 },
  { label: "Last 1 hour", minutes: 60 },
  { label: "Last 24 hours", minutes: 24 * 60 },
  { label: "Last 7 days", minutes: 7 * 24 * 60 },
  { label: "Last 30 days", minutes: 30 * 24 * 60 },
  { label: "Last 90 days", minutes: 90 * 24 * 60 },
  { label: "Last 1 year", minutes: 365 * 24 * 60 },
];

const UNIT_TO_MINUTES = {
  Minutes: 1,
  Hours: 60,
  Days: 24 * 60,
} as const;

type TimeUnit = keyof typeof UNIT_TO_MINUTES;

export function rangeLabel(minutes: number) {
  const common = COMMON_RANGES.find(item => item.minutes === minutes);
  if (common) return common.label;
  if (minutes % (24 * 60) === 0) return `Last ${minutes / (24 * 60)} days`;
  if (minutes % 60 === 0) return `Last ${minutes / 60} hours`;
  return `Last ${minutes} minutes`;
}

interface TimeRangePickerProps {
  rangeMinutes: number;
  onRangeChange: (minutes: number) => void;
  onRefresh?: () => void;
}

export function TimeRangePicker({ rangeMinutes, onRangeChange, onRefresh }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftAmount, setDraftAmount] = useState(15);
  const [draftUnit, setDraftUnit] = useState<TimeUnit>("Minutes");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(60);

  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;
    const id = setInterval(onRefresh, Math.max(5, refreshSeconds) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshSeconds, onRefresh]);

  const setDraftFromMinutes = (minutes: number) => {
    const dayValue = minutes / UNIT_TO_MINUTES.Days;
    const hourValue = minutes / UNIT_TO_MINUTES.Hours;
    if (Number.isInteger(dayValue) && dayValue >= 1) {
      setDraftAmount(dayValue);
      setDraftUnit("Days");
    } else if (Number.isInteger(hourValue) && hourValue >= 1) {
      setDraftAmount(hourValue);
      setDraftUnit("Hours");
    } else {
      setDraftAmount(minutes);
      setDraftUnit("Minutes");
    }
  };

  const chooseRange = (minutes: number) => {
    onRangeChange(minutes);
    setDraftFromMinutes(minutes);
    onRefresh?.();
    setOpen(false);
  };

  const applyDraftRange = () => {
    const minutes = Math.max(1, Math.floor(draftAmount || 1)) * UNIT_TO_MINUTES[draftUnit];
    chooseRange(minutes);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2 border-border bg-card px-3 text-foreground hover:bg-secondary">
          <CalendarDays className="h-4 w-4 text-primary" />
          {rangeLabel(rangeMinutes)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,470px)] rounded-lg border-border bg-card p-0 shadow-card">
        <div className="relative">
          <div className="absolute -top-2 right-28 h-4 w-4 rotate-45 border-l border-t border-border bg-card" />
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Quick select</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_100px_1fr_auto]">
              <Select defaultValue="Last">
                <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Last">Last</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={draftAmount}
                onChange={(event) => setDraftAmount(Number(event.target.value))}
                className="h-9 bg-background"
              />
              <Select value={draftUnit} onValueChange={(value) => setDraftUnit(value as TimeUnit)}>
                <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Minutes">Minutes</SelectItem>
                  <SelectItem value="Hours">Hours</SelectItem>
                  <SelectItem value="Days">Days</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90" onClick={applyDraftRange}>
                Apply
              </Button>
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-semibold">Commonly used</p>
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {COMMON_RANGES.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    className="text-left text-sm text-primary transition-colors hover:text-primary-glow"
                    onClick={() => chooseRange(item.minutes)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-semibold">Recently used date ranges</p>
              <button type="button" className="text-left text-sm text-primary hover:text-primary-glow" onClick={() => chooseRange(7 * 24 * 60)}>
                Last 7 days
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <span className="text-sm font-medium">Refresh every</span>
              <Input
                type="number"
                min={5}
                value={refreshSeconds}
                onChange={(event) => setRefreshSeconds(Number(event.target.value))}
                disabled={!autoRefresh}
                className="h-9 w-24 bg-background"
              />
              <span className="text-sm text-muted-foreground">Seconds</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
