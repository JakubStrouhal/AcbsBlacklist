import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, AlertCircle, Save, Link2, Link2Off } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { operatorEnum } from "@db/schema";
import { Badge } from "@/components/ui/badge";

interface Condition {
  parameter: string;
  operator: typeof operatorEnum.enumValues[number];
  value: string;
  orGroup?: number | null;
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
  const [selectedConditions, setSelectedConditions] = useState<{[key: number]: Set<number>}>({});

  const addGroup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([...groups, { description: '', conditions: [] }]);
    setSelectedConditions({ ...selectedConditions, [groups.length]: new Set() });
  };

  const removeGroup = (groupIndex: number) => {
    onChange(groups.filter((_, i) => i !== groupIndex));
    const newSelected = { ...selectedConditions };
    delete newSelected[groupIndex];
    setSelectedConditions(newSelected);
  };

  const updateGroupDescription = (groupIndex: number, description: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], description };
    onChange(newGroups);
  };

  const addCondition = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: [
        ...newGroups[groupIndex].conditions,
        {
          parameter: '',
          operator: '=' as typeof operatorEnum.enumValues[number],
          value: '',
          orGroup: null
        }
      ]
    };
    onChange(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: newGroups[groupIndex].conditions.filter((_, i) => i !== conditionIndex)
    };
    onChange(newGroups);

    // Remove condition from selected set
    const newSelected = new Set(selectedConditions[groupIndex]);
    newSelected.delete(conditionIndex);
    setSelectedConditions({ ...selectedConditions, [groupIndex]: newSelected });
  };

  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    field: keyof Condition,
    value: string
  ) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: newGroups[groupIndex].conditions.map((condition, i) => {
        if (i === conditionIndex) {
          if (field === 'operator' && operatorEnum.enumValues.includes(value as any)) {
            return { ...condition, [field]: value as typeof operatorEnum.enumValues[number] };
          } else if (field !== 'operator') {
            return { ...condition, [field]: value };
          }
        }
        return condition;
      })
    };
    onChange(newGroups);
  };

  const toggleConditionSelection = (groupIndex: number, conditionIndex: number) => {
    const newSelected = new Set(selectedConditions[groupIndex] || new Set());
    if (newSelected.has(conditionIndex)) {
      newSelected.delete(conditionIndex);
    } else {
      newSelected.add(conditionIndex);
    }
    setSelectedConditions({ ...selectedConditions, [groupIndex]: newSelected });
  };

  const groupSelectedConditions = (groupIndex: number) => {
    const selected = selectedConditions[groupIndex];
    if (!selected || selected.size < 2) return;

    const newGroups = [...groups];
    const orGroupId = Math.max(...newGroups[groupIndex].conditions.map(c => c.orGroup || 0)) + 1;

    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: newGroups[groupIndex].conditions.map((condition, idx) => {
        if (selected.has(idx)) {
          return { ...condition, orGroup: orGroupId };
        }
        return condition;
      })
    };

    onChange(newGroups);
    setSelectedConditions({ ...selectedConditions, [groupIndex]: new Set() });
  };

  const ungroupConditions = (groupIndex: number, orGroupId: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: newGroups[groupIndex].conditions.map(condition => {
        if (condition.orGroup === orGroupId) {
          return { ...condition, orGroup: null };
        }
        return condition;
      })
    };
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

              {/* Group by OR button */}
              {selectedConditions[groupIndex]?.size >= 2 && (
                <Button
                  type="button"
                  onClick={() => groupSelectedConditions(groupIndex)}
                  variant="outline"
                  size="sm"
                  className="mb-4"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Group Selected with OR
                </Button>
              )}

              {group.conditions.map((condition, conditionIndex) => {
                const isSelected = selectedConditions[groupIndex]?.has(conditionIndex);
                const orGroupId = condition.orGroup;

                return (
                  <div
                    key={conditionIndex}
                    className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    } ${orGroupId !== null ? 'border-l-4 border-blue-500 pl-4' : ''}`}
                  >
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => toggleConditionSelection(groupIndex, conditionIndex)}
                      className="w-8 h-8 p-0"
                    >
                      {isSelected ? '✓' : '○'}
                    </Button>

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

                    <div className="flex gap-2">
                      {orGroupId !== null && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => ungroupConditions(groupIndex, orGroupId)}
                          className="px-2"
                        >
                          <Link2Off className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(groupIndex, conditionIndex)}
                        className="px-2"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    {orGroupId !== null && (
                      <Badge variant="secondary" className="ml-2">
                        OR Group {orGroupId}
                      </Badge>
                    )}
                  </div>
                );
              })}

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