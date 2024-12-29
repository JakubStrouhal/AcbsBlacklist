import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Save } from "lucide-react";
import { operatorEnum } from "@db/schema";

interface Condition {
  parameter: string;
  operator: typeof operatorEnum.enumValues[number];
  value: string;
  orGroup: number | null;
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
  const addGroup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([...groups, { description: '', conditions: [] }]);
  };

  const removeGroup = (groupIndex: number) => {
    onChange(groups.filter((_, i) => i !== groupIndex));
  };

  const updateGroupDescription = (groupIndex: number, description: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], description };
    onChange(newGroups);
  };

  const addCondition = (groupIndex: number) => {
    const newGroups = [...groups];
    const currentConditions = newGroups[groupIndex].conditions;
    const lastOrGroup = currentConditions.length > 0 ? 
      currentConditions[currentConditions.length - 1].orGroup : null;

    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: [
        ...currentConditions,
        {
          parameter: '',
          operator: '=' as typeof operatorEnum.enumValues[number],
          value: '',
          orGroup: lastOrGroup
        }
      ]
    };
    onChange(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    const conditions = newGroups[groupIndex].conditions;

    // If we're removing a condition, we need to update the orGroup of the next condition
    if (conditionIndex < conditions.length - 1) {
      conditions[conditionIndex + 1].orGroup = conditionIndex > 0 ? 
        conditions[conditionIndex - 1].orGroup : null;
    }

    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: conditions.filter((_, i) => i !== conditionIndex)
    };
    onChange(newGroups);
  };

  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    field: keyof Condition,
    value: string | number | null
  ) => {
    const newGroups = [...groups];
    const conditions = newGroups[groupIndex].conditions;

    if (field === 'orGroup') {
      // Update the current condition's orGroup
      conditions[conditionIndex] = {
        ...conditions[conditionIndex],
        orGroup: value as number | null
      };

      // If this isn't the last condition, update the next condition's orGroup to match
      if (conditionIndex < conditions.length - 1) {
        conditions[conditionIndex + 1] = {
          ...conditions[conditionIndex + 1],
          orGroup: value as number | null
        };
      }
    } else {
      conditions[conditionIndex] = {
        ...conditions[conditionIndex],
        [field]: field === 'operator' && operatorEnum.enumValues.includes(value as any) 
          ? value 
          : value
      };
    }

    newGroups[groupIndex].conditions = conditions;
    onChange(newGroups);
  };

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <Card key={groupIndex}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {group.description || `Unnamed Group ${groupIndex + 1}`}
            </CardTitle>
            <Button
              type="button"
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
                placeholder="Enter group name"
                value={group.description}
                onChange={(e) => updateGroupDescription(groupIndex, e.target.value)}
              />

              {group.conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex}>
                  {conditionIndex > 0 && (
                    <div className="flex justify-center my-2">
                      <Select
                        value={condition.orGroup !== null ? 'or' : 'and'}
                        onValueChange={(value) => {
                          const newOrGroup = value === 'or' ? 
                            (group.conditions[conditionIndex - 1]?.orGroup ?? conditionIndex) : 
                            null;
                          updateCondition(groupIndex, conditionIndex, 'orGroup', newOrGroup);
                        }}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Select
                      value={condition.parameter}
                      onValueChange={(value) =>
                        updateCondition(groupIndex, conditionIndex, 'parameter', value)
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
                        updateCondition(groupIndex, conditionIndex, 'operator', value)
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
                        updateCondition(groupIndex, conditionIndex, 'value', e.target.value)
                      }
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(groupIndex, conditionIndex)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition(groupIndex)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Condition
                </Button>
              </div>

              {isEditing && onSaveGroup && group.conditions.length > 0 && (
                <Button
                  type="button"
                  onClick={() => onSaveGroup(groupIndex)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" /> Save Group
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button 
        type="button" 
        onClick={addGroup} 
        variant="outline" 
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" /> Add Condition Group
      </Button>
    </div>
  );
}