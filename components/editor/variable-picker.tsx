"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { VARIABLE_FUNCTIONS, CONDITIONAL_OPERATORS } from "@/lib/editor/variables"
import { Variable } from "lucide-react"
import { useVariableRegistry } from "@/components/editor/use-variable-registry"

interface VariablePickerProps {
  onSelect: (config: {
    variablePath: string
    functions: string[]
    conditionalDisplay?: {
      enabled: boolean
      variablePath: string
      operator: string
      compareValue?: string
    }
  }) => void
}

export function VariablePicker({ onSelect }: VariablePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedField, setSelectedField] = useState<string>("")
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([])
  const [conditionalEnabled, setConditionalEnabled] = useState(false)
  const [conditionalVariable, setConditionalVariable] = useState("")
  const [conditionalOperator, setConditionalOperator] = useState<keyof typeof CONDITIONAL_OPERATORS>("exists")
  const [conditionalValue, setConditionalValue] = useState("")
  const variableRegistry = useVariableRegistry()
  const registry = variableRegistry as Record<string, { label: string; fields: Record<string, { label: string; path: string }> }>

  const handleInsert = () => {
    if (!selectedField) return

    onSelect({
      variablePath: selectedField,
      functions: selectedFunctions,
      conditionalDisplay: conditionalEnabled
        ? {
            enabled: true,
            variablePath: conditionalVariable,
            operator: conditionalOperator,
            compareValue: conditionalValue,
          }
        : undefined,
    })

    setOpen(false)
    // Reset
    setSelectedCategory("")
    setSelectedField("")
    setSelectedFunctions([])
    setConditionalEnabled(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Variable className="mr-2 h-4 w-4" />
          Insérer variable
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insérer une variable</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category selection */}
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(registry).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field selection */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label>Champ</Label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un champ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(registry[selectedCategory]?.fields ?? {}).map(
                    ([key, value]) => (
                      <SelectItem key={key} value={value.path}>
                        {value.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Functions */}
          {selectedField && (
            <div className="space-y-2">
              <Label>Fonctions (optionnel)</Label>
              <div className="space-y-2">
                {Object.entries(VARIABLE_FUNCTIONS).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={selectedFunctions.includes(key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFunctions([...selectedFunctions, key])
                        } else {
                          setSelectedFunctions(selectedFunctions.filter((f) => f !== key))
                        }
                      }}
                    />
                    <label htmlFor={key} className="text-sm">
                      {value.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditional display */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="conditional"
                checked={conditionalEnabled}
                onCheckedChange={(checked) => setConditionalEnabled(checked as boolean)}
              />
              <label htmlFor="conditional" className="text-sm font-medium">
                Affichage conditionnel
              </label>
            </div>

            {conditionalEnabled && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label>Variable à tester</Label>
                  <Select value={conditionalVariable} onValueChange={setConditionalVariable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(registry).map(([catKey, catValue]) =>
                        Object.entries(catValue.fields).map(([fieldKey, fieldValue]) => (
                          <SelectItem key={fieldValue.path} value={fieldValue.path}>
                            {catValue.label} - {fieldValue.label}
                          </SelectItem>
                        )),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Opérateur</Label>
                  <Select
                    value={conditionalOperator}
                    onValueChange={(v) => setConditionalOperator(v as keyof typeof CONDITIONAL_OPERATORS)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITIONAL_OPERATORS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(conditionalOperator === "equals" ||
                  conditionalOperator === "notEquals" ||
                  conditionalOperator === "contains") && (
                  <div className="space-y-2">
                    <Label>Valeur de comparaison</Label>
                    <Input
                      value={conditionalValue}
                      onChange={(e) => setConditionalValue(e.target.value)}
                      placeholder="Valeur..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Button onClick={handleInsert} disabled={!selectedField} className="w-full">
            Insérer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
