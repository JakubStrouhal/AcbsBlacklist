import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { NewRule, Rule } from "@db/schema";

export default function RuleBuilder() {
  const { id } = useParams();
  const { data: existingRule } = useQuery({
    queryKey: ['rules', id],
    queryFn: () => api.getRule(Number(id)),
    enabled: !!id
  });

  const form = useForm<NewRule>({
    defaultValues: existingRule || {
      ruleName: '',
      ruleType: 'Global',
      status: 'Draft',
      action: 'NoInterest',
      customer: 'Any',
      country: 'Any',
      opportunitySource: 'Any'
    }
  });

  const onSubmit = async (data: NewRule) => {
    if (id) {
      await api.updateRule(Number(id), data);
    } else {
      await api.createRule(data);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Rule' : 'Create New Rule'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="ruleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

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
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="POZVI - NESLIBUJ">POZVI - NESLIBUJ</SelectItem>
                        <SelectItem value="POZVI SWAPEM - NESLIBUJ">POZVI SWAPEM - NESLIBUJ</SelectItem>
                        <SelectItem value="NEZVI - NECHCEME">NEZVI - NECHCEME</SelectItem>
                        <SelectItem value="NoInterest">NoInterest</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="submit">
                  {id ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
