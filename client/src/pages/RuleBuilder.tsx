import { useState, useEffect } from "react";
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
import { ruleValidationSchema, operatorEnum, type RuleWithConditions } from "@db/schema";
import { ConditionBuilder } from "@/components/ConditionBuilder";

interface ConditionGroup {
  description: string;
  conditions: Array<{
    parameter: string;
    operator: typeof operatorEnum.enumValues[number];
    value: string;
  }>;
}

type FormData = {
  ruleName: string;
  ruleType: 'Global' | 'Local';
  validUntil: string | null;
  status: 'Active' | 'Inactive' | 'Draft';
  action: 'POZVI - NESLIBUJ' | 'POZVI SWAPEM - NESLIBUJ' | 'NEZVI - NECHCEME';
  actionMessage: string;
  customer: 'Private' | 'Company' | 'Any';
  country: 'CZ' | 'SK' | 'PL' | 'Any';
  opportunitySource: 'Ticking' | 'Webform' | 'SMS' | 'Any';
  createdBy: number;
  lastModifiedBy: number;
};

export default function RuleBuilder() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([]);

  const { data: existingRule, isLoading } = useQuery({
    queryKey: ['rules', id],
    queryFn: () => api.getRule(Number(id)),
    enabled: !!id
  });

  const form = useForm<FormData>({
    resolver: zodResolver(ruleValidationSchema),
    defaultValues: {
      ruleName: '',
      ruleType: 'Global',
      validUntil: null,
      status: 'Draft',
      action: 'POZVI - NESLIBUJ',
      actionMessage: '',
      customer: 'Any',
      country: 'Any',
      opportunitySource: 'Any',
      createdBy: 1,
      lastModifiedBy: 1,
    }
  });

  useEffect(() => {
    if (existingRule) {
      form.reset({
        ruleName: existingRule.ruleName,
        ruleType: existingRule.ruleType,
        validUntil: existingRule.validUntil
          ? new Date(existingRule.validUntil).toISOString().slice(0, 16)
          : null,
        status: existingRule.status,
        action: existingRule.action,
        actionMessage: existingRule.actionMessage ?? '',
        customer: existingRule.customer,
        country: existingRule.country,
        opportunitySource: existingRule.opportunitySource,
        createdBy: existingRule.createdBy,
        lastModifiedBy: existingRule.lastModifiedBy,
      });

      setConditionGroups(
        existingRule.conditionGroups?.map(group => ({
          description: group.description ?? '',
          conditions: group.conditions.map(condition => ({
            parameter: condition.parameter,
            operator: condition.operator,
            value: condition.value
          }))
        })) || []
      );
    }
  }, [existingRule, form]);

  const handleConditionGroupsChange = (groups: ConditionGroup[]) => {
    setConditionGroups(groups);
  };

  const saveConditionGroup = async (groupIndex: number) => {
    if (!id) return;

    try {
      const group = conditionGroups[groupIndex];

      if (!group) {
        toast({
          title: "Error",
          description: "Group not found",
          variant: "destructive",
        });
        return;
      }

      if (!group.description) {
        toast({
          title: "Error",
          description: "Group description is required",
          variant: "destructive",
        });
        return;
      }

      if (!group.conditions.length) {
        toast({
          title: "Error",
          description: "At least one condition is required",
          variant: "destructive",
        });
        return;
      }

      await api.deleteRuleConditionGroups(Number(id));

      const newGroup = await api.createConditionGroup(Number(id), {
        description: group.description
      });

      for (const condition of group.conditions) {
        if (!condition.parameter || !condition.operator || !condition.value) {
          continue;
        }

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
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
      };

      if (id) {
        await api.updateRule(Number(id), ruleData);

        try {
          await api.deleteRuleConditionGroups(Number(id));
          for (const group of conditionGroups) {
            if (!group.description) continue;

            const newGroup = await api.createConditionGroup(Number(id), {
              description: group.description
            });

            for (const condition of group.conditions) {
              if (!condition.parameter || !condition.operator || !condition.value) continue;
              await api.createCondition(newGroup.conditionGroupId, condition);
            }
          }
        } catch (groupError) {
          console.error('Error saving condition groups:', groupError);
          toast({
            title: "Warning",
            description: "Rule saved but there was an error saving condition groups",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Rule and conditions updated successfully",
        });
      } else {
        const newRule = await api.createRule(ruleData);
        toast({
          title: "Success",
          description: "Rule created successfully",
        });
        navigate(`/rules/${newRule.ruleId}`);
      }

      queryClient.invalidateQueries({ queryKey: ['rules'] });
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rule",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
                  groups={conditionGroups}
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