import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal } from "lucide-react";

interface FilterState {
  ruleType: string | null;
  status: string | null;
  country: string | null;
  customer: string | null;
  opportunitySource: string | null;
}

interface Props {
  onFilterChange: (filters: FilterState) => void;
}

export function RPanel({ onFilterChange }: Props) {
  const [filters, setFilters] = React.useState<FilterState>({
    ruleType: null,
    status: null,
    country: null,
    customer: null,
    opportunitySource: null,
  });

  const handleFilterChange = (key: keyof FilterState, value: string | null) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed right-4 top-4 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Rules</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Rule Type</Label>
            <Select
              value={filters.ruleType ?? "all"}
              onValueChange={(value) => handleFilterChange("ruleType", value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Global">Global</SelectItem>
                <SelectItem value="Local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) => handleFilterChange("status", value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={filters.country ?? "all"}
              onValueChange={(value) => handleFilterChange("country", value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="CZ">Czech Republic</SelectItem>
                <SelectItem value="SK">Slovakia</SelectItem>
                <SelectItem value="PL">Poland</SelectItem>
                <SelectItem value="Any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Customer Type</Label>
            <Select
              value={filters.customer ?? "all"}
              onValueChange={(value) => handleFilterChange("customer", value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Customer Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customer Types</SelectItem>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Company">Company</SelectItem>
                <SelectItem value="Any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Opportunity Source</Label>
            <Select
              value={filters.opportunitySource ?? "all"}
              onValueChange={(value) => handleFilterChange("opportunitySource", value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Ticking">Ticking</SelectItem>
                <SelectItem value="Webform">Webform</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => {
              const resetFilters = {
                ruleType: null,
                status: null,
                country: null,
                customer: null,
                opportunitySource: null,
              };
              setFilters(resetFilters);
              onFilterChange(resetFilters);
            }}
          >
            Reset Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}