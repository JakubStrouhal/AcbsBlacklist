import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Save, GitMerge, GitBranch } from "lucide-react";
import { operatorEnum } from "@db/schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

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

// Define the parameter types and their possible operators
const PARAMETER_CONFIG = {
  make: {
    label: 'Make',
    operators: ['=', '!=', 'IN', 'NOT IN'],
    requiresEnum: true,
    enumEndpoint: '/api/vehicle/makes'
  },
  model: {
    label: 'Model',
    operators: ['=', '!=', 'IN', 'NOT IN'],
    requiresEnum: true,
    enumEndpoint: '/api/vehicle/models' // Will need makeId parameter
  },
  fuelType: {
    label: 'Fuel Type',
    operators: ['=', '!=', 'IN', 'NOT IN'],
    requiresEnum: true,
    enumEndpoint: '/api/vehicle/fuel-types'
  },
  engineType: {
    label: 'Engine Type',
    operators: ['=', '!=', 'IN', 'NOT IN'],
    requiresEnum: true,
    enumEndpoint: '/api/vehicle/engine-types'
  },
  makeYear: {
    label: 'Year',
    operators: ['=', '>', '<', '>=', '<=', 'BETWEEN'],
    requiresEnum: false
  },
  tachometer: {
    label: 'Tachometer',
    operators: ['=', '>', '<', '>=', '<=', 'BETWEEN'],
    requiresEnum: false
  },
  price: {
    label: 'Price',
    operators: ['=', '>', '<', '>=', '<=', 'BETWEEN'],
    requiresEnum: false
  }
};

export function ConditionBuilder({ groups = [], onChange, onSaveGroup, isEditing = false }: Props) {
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

    // Update orGroup for subsequent conditions
    if (conditionIndex < conditions.length - 1) {
      // If removing a condition that's part of an OR group, maintain the group for subsequent conditions
      if (conditions[conditionIndex].orGroup !== null) {
        const nextCondition = conditions[conditionIndex + 1];
        if (nextCondition.orGroup === conditions[conditionIndex].orGroup) {
          // Keep the OR group for the next condition if it's in the same group
          nextCondition.orGroup = conditionIndex > 0 ? conditions[conditionIndex - 1].orGroup : null;
        }
      }
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
      // When toggling OR group
      const currentCondition = conditions[conditionIndex];
      const newOrGroup = value as number | null;

      // Update current condition
      currentCondition.orGroup = newOrGroup;

      // If setting to OR (non-null), create or join an OR group
      if (newOrGroup !== null) {
        // Update subsequent conditions that were part of the same OR group
        for (let i = conditionIndex + 1; i < conditions.length; i++) {
          if (conditions[i].orGroup === currentCondition.orGroup) {
            conditions[i].orGroup = newOrGroup;
          } else {
            break;
          }
        }
      }
    } else {
      conditions[conditionIndex] = {
        ...conditions[conditionIndex],
        [field]: field === 'operator' && operatorEnum.enumValues.includes(value as any) 
          ? value 
          : value
      };

      // Handle make/model relationship
      if (field === 'parameter' && value === 'make') {
        setSelectedMakeId(null);
      }
      if (field === 'value' && conditions[conditionIndex].parameter === 'make') {
        setSelectedMakeId(value as string);
      }
    }

    newGroups[groupIndex].conditions = conditions;
    onChange(newGroups);
  };

  const getEnumValuesForParameter = (parameter: string, condition: Condition) => {
    switch (parameter) {
      case 'make':
        return makes || [];
      case 'model':
        return models || [];
      case 'fuelType':
        return fuelTypes || [];
      case 'engineType':
        return engineTypes || [];
      default:
        return [];
    }
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
                <div key={conditionIndex} className="flex items-center gap-2">
                  {conditionIndex > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateCondition(groupIndex, conditionIndex, 'orGroup', null)}
                        className={cn(
                          "w-[80px] transition-colors",
                          condition.orGroup === null
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <GitMerge className="mr-1 h-4 w-4" />
                        AND
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateCondition(groupIndex, conditionIndex, 'orGroup', conditionIndex)}
                        className={cn(
                          "w-[80px] transition-colors",
                          condition.orGroup !== null
                            ? "bg-orange-600 hover:bg-orange-700 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <GitBranch className="mr-1 h-4 w-4" />
                        OR
                      </Button>
                    </div>
                  )}

                  <Select
                    value={condition.parameter}
                    onValueChange={(value) =>
                      updateCondition(groupIndex, conditionIndex, 'parameter', value)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select Parameter" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PARAMETER_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
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
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {condition.parameter && PARAMETER_CONFIG[condition.parameter as keyof typeof PARAMETER_CONFIG].operators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {condition.parameter && PARAMETER_CONFIG[condition.parameter as keyof typeof PARAMETER_CONFIG].requiresEnum ? (
                    <Select
                      value={condition.value}
                      onValueChange={(value) =>
                        updateCondition(groupIndex, conditionIndex, 'value', value)
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Value" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEnumValuesForParameter(condition.parameter, condition).map((item: any) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="flex-1"
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) =>
                        updateCondition(groupIndex, conditionIndex, 'value', e.target.value)
                      }
                    />
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(groupIndex, conditionIndex)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
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