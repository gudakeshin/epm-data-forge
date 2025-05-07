
import { useState } from "react";
import { useModelContext } from "@/context/ModelContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { TimeGranularity } from "@/types/epm-types";
import { cn } from "@/lib/utils";

const DataSettingsStep = () => {
  const { model, updateTimeSettings, updateDataSettings, setCurrentStep } = useModelContext();
  const [startDate, setStartDate] = useState<Date>(model.timeSettings.startDate);
  const [endDate, setEndDate] = useState<Date>(model.timeSettings.endDate);
  const [granularity, setGranularity] = useState<TimeGranularity>(model.timeSettings.granularity);
  const [rowCount, setRowCount] = useState<number>(model.dataSettings.rowCount || 1000);
  const [sparsity, setSparsity] = useState<number>(model.dataSettings.sparsity || 30);

  // Handle saving settings
  const handleSaveSettings = () => {
    updateTimeSettings(startDate, endDate, granularity);
    updateDataSettings(rowCount, sparsity);
    setCurrentStep(4);
  };

  // Handle navigation
  const handleBack = () => {
    setCurrentStep(2);
  };

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Data Settings</h2>
          <p className="text-muted-foreground">
            Configure time periods, data volume, and sparsity settings
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Time Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar mr-2">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                          {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar mr-2">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                          {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Granularity</label>
                    <Select 
                      value={granularity} 
                      onValueChange={(value: TimeGranularity) => setGranularity(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select granularity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="quarters">Quarters</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Data Volume & Sparsity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Approximate Row Count</label>
                      <span className="text-sm font-medium">{rowCount.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                      <Input
                        type="number"
                        value={rowCount}
                        min={100}
                        max={1000000}
                        onChange={(e) => setRowCount(parseInt(e.target.value) || 1000)}
                        className="w-24"
                      />
                      <Slider
                        value={[rowCount]}
                        min={100}
                        max={100000}
                        step={100}
                        onValueChange={(values) => setRowCount(values[0])}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher row counts will generate more data but may take longer to process
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Data Sparsity</label>
                      <span className="text-sm font-medium">{sparsity}%</span>
                    </div>
                    <div className="flex gap-4 items-center">
                      <Input
                        type="number"
                        value={sparsity}
                        min={0}
                        max={100}
                        onChange={(e) => setSparsity(parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Slider
                        value={[sparsity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(values) => setSparsity(values[0])}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher sparsity means more empty cells in your dataset, similar to real EPM models
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={handleSaveSettings}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataSettingsStep;
