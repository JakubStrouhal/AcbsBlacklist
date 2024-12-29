import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { ValidationResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const validateSchema = z.object({
  ruleType: z.enum(['Global', 'Local']),
  country: z.enum(['CZ', 'SK', 'PL', 'Any']),
  customer: z.enum(['Private', 'Company', 'Any']),
  opportunitySource: z.enum(['Ticking', 'Webform', 'SMS', 'Any']),
  make: z.string().min(1, "Make is required"),
  model: z.string().optional(),
  yearComparison: z.enum(['=', '>', '<']).nullable(),
  makeYear: z.number().min(1900).max(new Date().getFullYear() + 1).nullable(),
  fuelType: z.string().optional(),
  tachometer: z.number().min(0).optional(),
  engine: z.string().optional(),
  price: z.number().min(0).optional(),
});

type FormData = z.infer<typeof validateSchema>;

export function ValidateRuleForm() {
  const { toast } = useToast();
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null);

  // Fetch enum data
  const { data: makes } = useQuery({
    queryKey: ['makes'],
    queryFn: async () => {
      const response = await fetch('/api/vehicle/makes');
      if (!response.ok) throw new Error('Failed to fetch makes');
      return response.json();
    }
  });

  const { data: models } = useQuery({
    queryKey: ['models', selectedMakeId],
    queryFn: async () => {
      if (!selectedMakeId) return [];
      const response = await fetch(`/api/vehicle/models/${selectedMakeId}`);
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json();
    },
    enabled: !!selectedMakeId
  });

  const { data: fuelTypes } = useQuery({
    queryKey: ['fuelTypes'],
    queryFn: async () => {
      const response = await fetch('/api/vehicle/fuel-types');
      if (!response.ok) throw new Error('Failed to fetch fuel types');
      return response.json();
    }
  });

  const { data: engineTypes } = useQuery({
    queryKey: ['engineTypes'],
    queryFn: async () => {
      const response = await fetch('/api/vehicle/engine-types');
      if (!response.ok) throw new Error('Failed to fetch engine types');
      return response.json();
    }
  });

  const form = useForm<FormData>({
    resolver: zodResolver(validateSchema),
    defaultValues: {
      ruleType: 'Global',
      country: 'CZ',
      customer: 'Private',
      opportunitySource: 'Webform',
      make: '',
      model: '',
      yearComparison: null,
      makeYear: null,
      fuelType: '',
      tachometer: 0,
      engine: '',
      price: 0,
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await api.validateVehicle(data);
      setResult(response);

      toast({
        title: "Validation Complete",
        description: response.actionMessage || "Rule validation completed successfully",
        variant: response.isMatch ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error validating rule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to validate rule",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validate Vehicle Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rule Type */}
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rule type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Global">Global</SelectItem>
                        <SelectItem value="Local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CZ">Czech Republic</SelectItem>
                        <SelectItem value="SK">Slovakia</SelectItem>
                        <SelectItem value="PL">Poland</SelectItem>
                        <SelectItem value="Any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Type */}
              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Private">Private</SelectItem>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="Any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Opportunity Source */}
              <FormField
                control={form.control}
                name="opportunitySource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ticking">Ticking</SelectItem>
                        <SelectItem value="Webform">Webform</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="Any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Make */}
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedMakeId(value);
                        // Reset model when make changes
                        form.setValue('model', '');
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select make" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {makes?.map((make: any) => (
                          <SelectItem key={make.id} value={make.id.toString()}>
                            {make.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedMakeId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedMakeId ? "Select model" : "Select make first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models?.map((model: any) => (
                          <SelectItem key={model.id} value={model.id.toString()}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year Comparison and Make Year */}
              <div className="flex gap-4 col-span-2">
                <FormField
                  control={form.control}
                  name="yearComparison"
                  render={({ field }) => (
                    <FormItem className="flex-shrink-0 w-24">
                      <FormLabel>Compare (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value || null)}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="=" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={null}>None</SelectItem>
                          <SelectItem value="=">=</SelectItem>
                          <SelectItem value=">">&#62;</SelectItem>
                          <SelectItem value="<">&#60;</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="makeYear"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Make Year (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? Number(value) : null);
                          }}
                          placeholder="Enter year"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fuel Type */}
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fuelTypes?.map((fuelType: any) => (
                          <SelectItem key={fuelType.id} value={fuelType.id.toString()}>
                            {fuelType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tachometer */}
              <FormField
                control={form.control}
                name="tachometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tachometer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        placeholder="Enter tachometer reading"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Engine */}
              <FormField
                control={form.control}
                name="engine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engine</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select engine type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {engineTypes?.map((engine: any) => (
                          <SelectItem key={engine.id} value={engine.id.toString()}>
                            {engine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        placeholder="Enter price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {result && (
              <div className="mt-6 p-4 border rounded-lg bg-background">
                <h3 className="text-lg font-semibold mb-2">Validation Result</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant={result.isMatch ? "success" : "destructive"}>
                      {result.isMatch ? "Match Found" : "No Match"}
                    </Badge>
                  </div>
                  {result.action && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Action:</span>
                      <span>{result.action}</span>
                    </div>
                  )}
                  {result.actionMessage && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Message:</span>
                      <span>{result.actionMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Validate
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}