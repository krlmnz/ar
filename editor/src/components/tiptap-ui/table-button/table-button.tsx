"use client"

import { useCurrentEditor } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"

function TableIcon() {
  return (
    <svg className="tiptap-button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M3.5 14h17M9 5v14M15 5v14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function TableButton() {
  const { editor } = useCurrentEditor()
  if (!editor) return null
  const inTable = editor.isActive("table")

  if (!inTable) {
    return (
      <Button
        type="button"
        tooltip="Insert table"
        aria-label="Insert table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon />
      </Button>
    )
  }

  return (
    <>
      <Button type="button" tooltip="Add row" aria-label="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
        Row+
      </Button>
      <Button type="button" tooltip="Add column" aria-label="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
        Col+
      </Button>
      <Button
        type="button"
        tooltip="Toggle header row"
        aria-label="Toggle header row"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        Header
      </Button>
      <Button
        type="button"
        tooltip="Delete row"
        aria-label="Delete row"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        −Row
      </Button>
      <Button
        type="button"
        tooltip="Delete column"
        aria-label="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        −Col
      </Button>
      <Button
        type="button"
        tooltip="Delete table"
        aria-label="Delete table"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        Delete
      </Button>
    </>
  )
}
