import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { ruleValidationSchema, operatorEnum, type Rule } from "@db/schema";
import { ConditionBuilder } from "@/components/ConditionBuilder";

interface ConditionGroup {
  description: string;
  conditions: Array<{
    parameter: string;
    operator: typeof operatorEnum.enumValues[number];
    value: string;
  }>;
}

type FormData = Omit<Rule, 'ruleId' | 'lastModifiedDate'> & {
  validUntil: string | undefined;
  conditionGroups?: ConditionGroup[];
};

export default function RuleBuilder() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingRule } = useQuery({
    queryKey: ['rules', id],
    queryFn: () => api.getRule(Number(id)),
    enabled: !!id
  });

  const form = useForm<FormData>({
    resolver: zodResolver(ruleValidationSchema),
    defaultValues: {
      ruleName: existingRule?.ruleName || '',
      ruleType: existingRule?.ruleType || 'Global',
      validUntil: existingRule?.validUntil
        ? new Date(existingRule.validUntil).toISOString().slice(0, 16)
        : undefined,
      status: existingRule?.status || 'Draft',
      action: existingRule?.action || 'POZVI - NESLIBUJ',
      actionMessage: existingRule?.actionMessage || '',
      customer: existingRule?.customer || 'Any',
      country: existingRule?.country || 'Any',
      opportunitySource: existingRule?.opportunitySource || 'Any',
      createdBy: existingRule?.createdBy || 1,
      lastModifiedBy: 1,
      conditionGroups: existingRule?.conditionGroups?.map(group => ({
        description: group.description,
        conditions: group.conditions.map(condition => ({
          parameter: condition.parameter,
          operator: condition.operator,
          value: condition.value
        }))
      })) || []
    }
  });

  const handleConditionGroupsChange = (groups: ConditionGroup[]) => {
    form.setValue('conditionGroups', groups, { shouldDirty: true });
  };

  const saveConditionGroup = async (groupIndex: number) => {
    if (!id) return;

    try {
      const groups = form.getValues('conditionGroups') || [];
      const group = groups[groupIndex];

      if (!group || !group.description) {
        toast({
          title: "Error",
          description: "Group description is required",
          variant: "destructive",
        });
        return;
      }

      const newGroup = await api.createConditionGroup(Number(id), {
        description: group.description
      });

      for (const condition of group.conditions) {
        if (!condition.parameter || !condition.operator || !condition.value) continue;

        await api.createCondition(newGroup.conditionGroupId, {
          parameter: condition.parameter,
          operator: condition.operator,
          value: condition.value
        });
      }

      queryClient.invalidateQueries({ queryKey: ['rules', id] });

      toast({
        title: "Success",
        description: `Condition group ${groupIndex + 1} saved successfully`,
      });
    } catch (error) {
      console.error('Error saving condition group:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save condition group",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const ruleData = {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        lastModifiedDate: new Date()
      };

      const { conditionGroups: _, ...ruleDataWithoutConditions } = ruleData;

      if (id) {
        await api.updateRule(Number(id), ruleDataWithoutConditions);
        toast({
          title: "Success",
          description: "Rule updated successfully",
        });
      } else {
        const newRule = await api.createRule(ruleDataWithoutConditions);
        toast({
          title: "Success",
          description: "Rule created successfully",
        });
        navigate(`/rules/${newRule.ruleId}`);
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rule",
        variant: "destructive",
      });
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
                      <Input {...field} placeholder="Enter rule name" />
                    </FormControl>
                    <FormMessage />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actionMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter detailed message for this action"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="CZ">CZ</SelectItem>
                        <SelectItem value="SK">SK</SelectItem>
                        <SelectItem value="PL">PL</SelectItem>
                        <SelectItem value="Any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opportunitySource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select opportunity source" />
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

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Conditions</h3>
                <ConditionBuilder
                  groups={form.watch('conditionGroups') || []}
                  onChange={handleConditionGroupsChange}
                  onSaveGroup={saveConditionGroup}
                  isEditing={!!id}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => navigate("/")}>
                  Cancel
                </Button>
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