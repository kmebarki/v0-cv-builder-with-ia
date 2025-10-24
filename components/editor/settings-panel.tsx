"use client"

import { useEditor, useNode } from "@craftjs/core"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CV_VARIABLES, VARIABLE_FUNCTIONS, CONDITIONAL_OPERATORS } from "@/lib/editor/variables"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export function SettingsPanel() {
  const { selected } = useEditor((state) => {
    const [currentNodeId] = state.events.selected
    return {
      selected: currentNodeId,
    }
  })

  if (!selected) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Sélectionnez un élément pour modifier ses propriétés
      </div>
    )
  }

  return <NodeSettings />
}

function NodeSettings() {
  const {
    actions: { setProp },
    props,
    name,
  } = useNode((node) => ({
    props: node.data.props,
    name: node.data.displayName || node.data.name,
  }))

  if (name === "Variable Text" || name === "VariableTextNode") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Variable</Label>
          <Select
            value={props.variablePath || ""}
            onValueChange={(value) => setProp((props: any) => (props.variablePath = value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une variable" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CV_VARIABLES).map(([catKey, catValue]) =>
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
          <Label>Texte de secours</Label>
          <Input
            value={props.fallbackText || ""}
            onChange={(e) => setProp((props: any) => (props.fallbackText = e.target.value))}
            placeholder="Texte si variable vide"
          />
        </div>

        <div className="space-y-2">
          <Label>Fonctions</Label>
          <div className="flex flex-wrap gap-2">
            {(props.functions || []).map((func: string) => (
              <Badge key={func} variant="secondary">
                {VARIABLE_FUNCTIONS[func as keyof typeof VARIABLE_FUNCTIONS]?.label}
                <button
                  onClick={() =>
                    setProp((props: any) => (props.functions = props.functions.filter((f: string) => f !== func)))
                  }
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Select
            value=""
            onValueChange={(value) => setProp((props: any) => (props.functions = [...(props.functions || []), value]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ajouter une fonction" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VARIABLE_FUNCTIONS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Taille de police</Label>
          <Input
            type="number"
            value={props.fontSize || 16}
            onChange={(e) => setProp((props: any) => (props.fontSize = Number.parseInt(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Couleur</Label>
          <Input
            type="color"
            value={props.color || "#000000"}
            onChange={(e) => setProp((props: any) => (props.color = e.target.value))}
          />
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="conditional"
              checked={props.conditionalDisplay?.enabled || false}
              onCheckedChange={(checked) =>
                setProp(
                  (props: any) =>
                    (props.conditionalDisplay = {
                      ...props.conditionalDisplay,
                      enabled: checked,
                    }),
                )
              }
            />
            <Label htmlFor="conditional">Affichage conditionnel</Label>
          </div>

          {props.conditionalDisplay?.enabled && (
            <div className="space-y-3 pl-6">
              <div className="space-y-2">
                <Label>Variable à tester</Label>
                <Select
                  value={props.conditionalDisplay?.variablePath || ""}
                  onValueChange={(value) =>
                    setProp(
                      (props: any) =>
                        (props.conditionalDisplay = {
                          ...props.conditionalDisplay,
                          variablePath: value,
                        }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CV_VARIABLES).map(([catKey, catValue]) =>
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
                  value={props.conditionalDisplay?.operator || "exists"}
                  onValueChange={(value) =>
                    setProp(
                      (props: any) =>
                        (props.conditionalDisplay = {
                          ...props.conditionalDisplay,
                          operator: value,
                        }),
                    )
                  }
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
            </div>
          )}
        </div>
      </div>
    )
  }

  if (name === "Text" || name === "TextNode") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Taille de police</Label>
          <Input
            type="number"
            value={props.fontSize || 16}
            onChange={(e) => setProp((props: any) => (props.fontSize = Number.parseInt(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Poids</Label>
          <Select
            value={props.fontWeight || "normal"}
            onValueChange={(value) => setProp((props: any) => (props.fontWeight = value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Gras</SelectItem>
              <SelectItem value="lighter">Léger</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Couleur</Label>
          <Input
            type="color"
            value={props.color || "#000000"}
            onChange={(e) => setProp((props: any) => (props.color = e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>Alignement</Label>
          <Select
            value={props.textAlign || "left"}
            onValueChange={(value) => setProp((props: any) => (props.textAlign = value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Gauche</SelectItem>
              <SelectItem value="center">Centre</SelectItem>
              <SelectItem value="right">Droite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  if (name === "Rich Text" || name === "RichTextNode") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Hauteur minimale</Label>
          <Input
            type="number"
            value={props.minHeight || 100}
            onChange={(e) => setProp((props: any) => (props.minHeight = Number.parseInt(e.target.value)))}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Utilisez la barre d'outils dans l'éditeur pour formater le texte
        </div>
      </div>
    )
  }

  if (name === "Container") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Padding</Label>
          <Input
            type="number"
            value={props.padding || 0}
            onChange={(e) => setProp((props: any) => (props.padding = Number.parseInt(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Margin</Label>
          <Input
            type="number"
            value={props.margin || 0}
            onChange={(e) => setProp((props: any) => (props.margin = Number.parseInt(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Couleur de fond</Label>
          <Input
            type="color"
            value={props.background || "#ffffff"}
            onChange={(e) => setProp((props: any) => (props.background = e.target.value))}
          />
        </div>
      </div>
    )
  }

  if (name === "Image" || name === "ImageNode") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>URL de l'image</Label>
          <Input
            type="text"
            value={props.src || ""}
            onChange={(e) => setProp((props: any) => (props.src = e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>Largeur</Label>
          <Input
            type="number"
            value={props.width || 200}
            onChange={(e) => setProp((props: any) => (props.width = Number.parseInt(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label>Hauteur</Label>
          <Input
            type="number"
            value={props.height || 200}
            onChange={(e) => setProp((props: any) => (props.height = Number.parseInt(e.target.value)))}
          />
        </div>
      </div>
    )
  }

  return <div className="text-sm text-muted-foreground">Aucun paramètre disponible</div>
}
