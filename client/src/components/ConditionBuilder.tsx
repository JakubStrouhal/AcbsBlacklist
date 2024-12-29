import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { operatorEnum } from "@db/schema";

interface Condition {
  parameter: string;
  operator: typeof operatorEnum.enumValues[number];
  value: string;
}

interface ConditionGroup {
  description: string;
  conditions: Condition[];
}

interface Props {
  groups: ConditionGroup[];
  onChange: (groups: ConditionGroup[]) => void;
  onSaveGroup?: (groupIndex: number) => Promise<void>;
  isEditing?: boolean;
}

const PARAMETERS = [
  { value: 'make', label: 'Make' },
  { value: 'model', label: 'Model' },
  { value: 'makeYear', label: 'Year' },
  { value: 'tachometer', label: 'Tachometer' },
  { value: 'fuelType', label: 'Fuel Type' },
  { value: 'price', label: 'Price' }
];

const OPERATORS: Array<{ value: typeof operatorEnum.enumValues[number]; label: string }> = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater Than or Equal' },
  { value: '<=', label: 'Less Than or Equal' },
  { value: 'IN', label: 'In List' },
  { value: 'NOT IN', label: 'Not In List' },
  { value: 'BETWEEN', label: 'Between' }
];

export function ConditionBuilder({ groups = [], onChange, onSaveGroup, isEditing = false }: Props) {
  const addGroup = () => {
    onChange([...groups, { description: '', conditions: [] }]);
  };

  const removeGroup = (groupIndex: number) => {
    onChange(groups.filter((_, i) => i !== groupIndex));
  };

  const updateGroupDescription = (groupIndex: number, description: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex].description = description;
    onChange(newGroups);
  };

  const addCondition = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.push({
      parameter: '',
      operator: '=' as typeof operatorEnum.enumValues[number],
      value: ''
    });
    onChange(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions = newGroups[groupIndex].conditions.filter(
      (_, i) => i !== conditionIndex
    );
    onChange(newGroups);
  };

  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    field: keyof Condition,
    value: string
  ) => {
    const newGroups = [...groups];
    if (field === 'operator' && operatorEnum.enumValues.includes(value as any)) {
      newGroups[groupIndex].conditions[conditionIndex][field] = value as typeof operatorEnum.enumValues[number];
    } else if (field !== 'operator') {
      (newGroups[groupIndex].conditions[conditionIndex] as any)[field] = value;
    }
    onChange(newGroups);
  };

  if (!Array.isArray(groups)) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No condition groups defined. Add a group to start defining conditions.
          </AlertDescription>
        </Alert>
        <Button onClick={addGroup}>
          <Plus className="mr-2 h-4 w-4" /> Add Condition Group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <Card key={groupIndex}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Condition Group {groupIndex + 1}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeGroup(groupIndex)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Group Description"
                value={group.description}
                onChange={(e) =>
                  updateGroupDescription(groupIndex, e.target.value)
                }
              />
              {group.conditions.map((condition, conditionIndex) => (
                <div
                  key={conditionIndex}
                  className="flex items-center space-x-2"
                >
                  <Select
                    value={condition.parameter}
                    onValueChange={(value) =>
                      updateCondition(
                        groupIndex,
                        conditionIndex,
                        'parameter',
                        value
                      )
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Parameter" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARAMETERS.map((param) => (
                        <SelectItem key={param.value} value={param.value}>
                          {param.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={condition.operator}
                    onValueChange={(value) =>
                      updateCondition(
                        groupIndex,
                        conditionIndex,
                        'operator',
                        value
                      )
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Value"
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(
                        groupIndex,
                        conditionIndex,
                        'value',
                        e.target.value
                      )
                    }
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(groupIndex, conditionIndex)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition(groupIndex)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Condition
                </Button>
                {isEditing && onSaveGroup && (
                  <Button
                    type="button"
                    onClick={() => onSaveGroup(groupIndex)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" /> Save Conditions
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={addGroup} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add Condition Group
      </Button>
    </div>
  );
}