"use client"

import { Element, useEditor } from "@craftjs/core"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/editor/nodes/container"
import { TextNode } from "@/components/editor/nodes/text-node"
import { VariableTextNode } from "@/components/editor/nodes/variable-text-node"
import { ImageNode } from "@/components/editor/nodes/image-node"
import { RichTextNode } from "@/components/editor/nodes/rich-text-node"
import { ImageIcon, Type, Box, Variable, FileText } from "lucide-react"

export function Toolbox() {
  const { connectors } = useEditor()

  return (
    <div className="space-y-2">
      <h3 className="mb-4 font-semibold">Composants</h3>

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
            <Element is={VariableTextNode} variablePath="" fallbackText="Variable" fontSize={16} />,
          )
        }
        variant="outline"
        className="w-full justify-start bg-transparent"
      >
        <Variable className="mr-2 h-4 w-4" />
        Texte Variable
      </Button>

      <Button
        ref={(ref) =>
          ref &&
          connectors.create(
            ref,
            <Element is={RichTextNode} content={[{ type: "p", children: [{ text: "Texte enrichi..." }] }]} />,
          )
        }
        variant="outline"
        className="w-full justify-start bg-transparent"
      >
        <FileText className="mr-2 h-4 w-4" />
        Texte Enrichi
      </Button>

      <Button
        ref={(ref) =>
          ref &&
          connectors.create(
            ref,
            <Element is={Container} canvas padding={16} className="border-2 border-dashed border-gray-300" />,
          )
        }
        variant="outline"
        className="w-full justify-start bg-transparent"
      >
        <Box className="mr-2 h-4 w-4" />
        Container
      </Button>

      <Button
        ref={(ref) =>
          ref && connectors.create(ref, <Element is={ImageNode} src="/placeholder.svg" width={200} height={200} />)
        }
        variant="outline"
        className="w-full justify-start bg-transparent"
      >
        <ImageIcon className="mr-2 h-4 w-4" />
        Image
      </Button>
    </div>
  )
}
