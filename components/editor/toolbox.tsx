"use client"

import { Element, useEditor } from "@craftjs/core"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/editor/nodes/container"
import { TextNode } from "@/components/editor/nodes/text-node"
import { VariableTextNode } from "@/components/editor/nodes/variable-text-node"
import { ImageNode } from "@/components/editor/nodes/image-node"
import { RichTextNode } from "@/components/editor/nodes/rich-text-node"
import { PageNode } from "@/components/editor/nodes/page-node"
import { SectionNode } from "@/components/editor/nodes/section-node"
import { StackNode } from "@/components/editor/nodes/stack-node"
import { GridNode } from "@/components/editor/nodes/grid-node"
import { BadgeNode } from "@/components/editor/nodes/badge-node"
import { RatingNode } from "@/components/editor/nodes/rating-node"
import { ShapeNode } from "@/components/editor/nodes/shape-node"
import { RepeatNode } from "@/components/editor/nodes/repeat-node"
import { MediaLibrary } from "@/components/editor/media-library"
import {
  ImageIcon,
  Type,
  Box,
  Variable,
  FileText,
  LayoutTemplate,
  Rows,
  Columns,
  Tags,
  Star,
  Shapes,
  Ruler,
  Repeat,
} from "lucide-react"

interface ToolboxProps {
  onAddGuide?: (orientation: "horizontal" | "vertical") => void
}

export function Toolbox({ onAddGuide }: ToolboxProps) {
  const { connectors } = useEditor()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Structure</h3>
        <div className="space-y-2">
          <Button
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Element is={PageNode} canvas padding={48} background="#FFFFFF" orientation="portrait" />,
              )
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Page
          </Button>

          <Button
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Element is={SectionNode} canvas title="Nouvelle section" padding={32} gap={16} background="#FFFFFF" />,
              )
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Rows className="mr-2 h-4 w-4" />
            Section
          </Button>

          <Button
            ref={(ref) =>
              ref &&
              connectors.create(ref, <Element is={Container} canvas padding={16} className="border border-dashed" />)
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Box className="mr-2 h-4 w-4" />
            Container
          </Button>

          <Button
            ref={(ref) => ref && connectors.create(ref, <Element is={StackNode} canvas gap={12} direction="vertical" />)}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Columns className="mr-2 h-4 w-4" />
            Stack
          </Button>

          <Button
            ref={(ref) => ref && connectors.create(ref, <Element is={GridNode} canvas columns={2} rows={1} gap={16} />)}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Rows className="mr-2 h-4 w-4 rotate-90" />
            Grid
          </Button>

          <Button
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Element
                  is={RepeatNode}
                  canvas
                  collectionPath="experiences"
                  itemAlias="experience"
                  indexAlias="experienceIndex"
                />,
              )
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Repeat className="mr-2 h-4 w-4" />
            Répétition
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contenu</h3>
        <div className="space-y-2">
          <Button
            ref={(ref) => ref && connectors.create(ref, <Element is={TextNode} text="Nouveau texte" fontSize={16} />)}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Type className="mr-2 h-4 w-4" />
            Texte
          </Button>

          <Button
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Element
                  is={VariableTextNode}
                  variablePath=""
                  fallbackText="Variable"
                  fontSize={16}
                  borderRadius={4}
                  padding={6}
                />,
              )
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Variable className="mr-2 h-4 w-4" />
            Texte dynamique
          </Button>

          <Button
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Element
                  is={RichTextNode}
                  minHeight={120}
                  content={[{ type: "paragraph", children: [{ text: "Texte enrichi..." }] }]}
                />,
              )
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <FileText className="mr-2 h-4 w-4" />
            Texte enrichi
          </Button>

          <Button
            ref={(ref) =>
              ref && connectors.create(ref, <Element is={ImageNode} src="/placeholder.svg" width={180} height={180} />)
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Image
          </Button>

          <Button
            ref={(ref) => ref && connectors.create(ref, <Element is={BadgeNode} label="Compétence" />)}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Tags className="mr-2 h-4 w-4" />
            Badge
          </Button>

          <Button
            ref={(ref) =>
              ref &&
              connectors.create(
                ref,
                <Element
                  is={RatingNode}
                  value={4}
                  max={5}
                  valueSource="static"
                  maxSource="static"
                  showLabel
                />,
              )
            }
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Star className="mr-2 h-4 w-4" />
            Rating
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Graphisme</h3>
        <div className="space-y-2">
          <Button
            ref={(ref) => ref && connectors.create(ref, <Element is={ShapeNode} type="line" width={200} borderWidth={2} />)}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Shapes className="mr-2 h-4 w-4" />
            Forme / Ligne
          </Button>

          <Button
            onClick={() => onAddGuide?.("horizontal")}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Ruler className="mr-2 h-4 w-4" />
            Nouveau repère horizontal
          </Button>
          <Button
            onClick={() => onAddGuide?.("vertical")}
            variant="outline"
            className="w-full justify-start bg-transparent"
          >
            <Ruler className="mr-2 h-4 w-4 rotate-90" />
            Nouveau repère vertical
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Médiathèque</h3>
        <MediaLibrary />
      </div>
    </div>
  )
}
