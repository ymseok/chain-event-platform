'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterCondition } from '@/types';

const OPERATORS = [
  { value: 'eq', label: '= (equals)' },
  { value: 'ne', label: '!= (not equal)' },
  { value: 'gt', label: '> (greater than)' },
  { value: 'gte', label: '>= (greater or equal)' },
  { value: 'lt', label: '< (less than)' },
  { value: 'lte', label: '<= (less or equal)' },
  { value: 'contains', label: 'contains' },
] as const;

interface EventParameter {
  name: string;
  type: string;
}

/**
 * Parses event parameters string like "(address from, address to, uint256 value)"
 * into an array of { name, type }.
 */
export function parseEventParameters(parameters: string): EventParameter[] {
  const inner = parameters.replace(/^\(/, '').replace(/\)$/, '').trim();
  if (!inner) return [];

  return inner.split(',').map((param) => {
    const parts = param.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { type: parts.slice(0, -1).join(' '), name: parts[parts.length - 1] };
    }
    return { type: parts[0], name: parts[0] };
  });
}

interface FilterConditionBuilderProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  parameters?: string;
  disabled?: boolean;
}

export function FilterConditionBuilder({
  conditions,
  onChange,
  parameters,
  disabled = false,
}: FilterConditionBuilderProps) {
  const fields = parameters ? parseEventParameters(parameters) : [];

  const addCondition = () => {
    onChange([...conditions, { field: '', operator: 'eq', value: '' }]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    onChange(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  return (
    <div className="space-y-3">
      {conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2">
          {fields.length > 0 ? (
            <Select
              value={condition.field}
              onValueChange={(value) => updateCondition(index, { field: value })}
              disabled={disabled}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({f.type})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Field name"
              value={condition.field}
              onChange={(e) => updateCondition(index, { field: e.target.value })}
              className="w-[160px]"
              disabled={disabled}
            />
          )}

          <Select
            value={condition.operator}
            onValueChange={(value) =>
              updateCondition(index, {
                operator: value as FilterCondition['operator'],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Operator" />
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
            value={String(condition.value)}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="flex-1"
            disabled={disabled}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeCondition(index)}
            disabled={disabled}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
        disabled={disabled}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Condition
      </Button>
    </div>
  );
}
