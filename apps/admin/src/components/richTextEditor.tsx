import { cn } from "@puckhub/ui"
import CharacterCount from "@tiptap/extension-character-count"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import Typography from "@tiptap/extension-typography"
import Underline from "@tiptap/extension-underline"
import Youtube from "@tiptap/extension-youtube"
import { type Editor, EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo,
  Upload,
  Youtube as YoutubeIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

// ---------------------------------------------------------------------------
// Color presets
// ---------------------------------------------------------------------------
const TEXT_COLORS = [
  { name: "Standard", value: "" },
  { name: "Schwarz", value: "#171717" },
  { name: "Dunkelgrau", value: "#525252" },
  { name: "Grau", value: "#a3a3a3" },
  { name: "Dunkelblau", value: "#1e3a5f" },
  { name: "Blau", value: "#2563eb" },
  { name: "Rot", value: "#dc2626" },
  { name: "Dunkelrot", value: "#991b1b" },
  { name: "Grün", value: "#16a34a" },
  { name: "Orange", value: "#ea580c" },
  { name: "Lila", value: "#9333ea" },
  { name: "Gold", value: "#ca8a04" },
]

const HIGHLIGHT_COLORS = [
  { name: "Kein", value: "" },
  { name: "Gelb", value: "#fef08a" },
  { name: "Grün", value: "#bbf7d0" },
  { name: "Blau", value: "#bfdbfe" },
  { name: "Rosa", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Lila", value: "#e9d5ff" },
  { name: "Rot", value: "#fecaca" },
  { name: "Grau", value: "#e5e5e5" },
]

// ---------------------------------------------------------------------------
// Main Editor Component
// ---------------------------------------------------------------------------
export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const editorRef = useRef<Editor | null>(null)

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "photo")

      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload fehlgeschlagen")
      }

      const data = await res.json()
      return `${apiUrl}${data.url}`
    } catch (err) {
      console.error("Image upload failed:", err)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "editor-image" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Inhalt schreiben..." }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "editor-table" },
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({
        HTMLAttributes: { class: "editor-youtube" },
        inline: false,
        nocookie: true,
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files.length) return false
        const images = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
        if (!images.length) return false
        event.preventDefault()

        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })

        // Process all image uploads in parallel
        Promise.all(
          images.map(async (file) => {
            const url = await uploadImage(file)
            const ed = editorRef.current
            if (!url || !ed) return
            if (coords) {
              ed.chain().focus(coords.pos).setImage({ src: url }).run()
            } else {
              ed.chain().focus().setImage({ src: url }).run()
            }
          }),
        ).catch((error) => {
          console.error("Failed to upload images:", error)
        })

        return true
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"))
        if (!files.length) return false
        event.preventDefault()

        // Process all image uploads in parallel
        Promise.all(
          files.map(async (file) => {
            const url = await uploadImage(file)
            const ed = editorRef.current
            if (!url || !ed) return
            ed.chain().focus().setImage({ src: url }).run()
          }),
        ).catch((error) => {
          console.error("Failed to upload images:", error)
        })

        return true
      },
    },
  })

  // Keep editorRef in sync
  editorRef.current = editor

  // Drag & drop visual feedback
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(() => {
    dragCounterRef.current = 0
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && editor) {
        const url = await uploadImage(file)
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [editor, uploadImage],
  )

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href ?? ""
    const url = window.prompt("URL eingeben:", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const insertYoutube = useCallback(() => {
    if (!editor) return
    const url = window.prompt("YouTube-URL eingeben:")
    if (!url) return
    editor.commands.setYoutubeVideo({ src: url })
  }, [editor])

  if (!editor) return null

  const isInTable = editor.isActive("table")
  const charCount = editor.storage.characterCount

  return (
    <div className="rich-text-editor rounded-lg border border-input overflow-hidden shadow-sm">
      {/* Main Toolbar */}
      <EditorToolbar
        editor={editor}
        uploading={uploading}
        onFileSelect={() => fileInputRef.current?.click()}
        onSetLink={setLink}
        onInsertYoutube={insertYoutube}
      />

      {/* Table Context Toolbar */}
      {isInTable && <TableContextToolbar editor={editor} />}

      {/* Editor Content Area */}
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && <DropOverlay />}
        {uploading && <UploadingOverlay />}
        <EditorContent editor={editor} className="prose-editor" />
      </div>

      {/* Status Bar */}
      <StatusBar charCount={charCount} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor Toolbar
// ---------------------------------------------------------------------------
function EditorToolbar({
  editor,
  uploading,
  onFileSelect,
  onSetLink,
  onInsertYoutube,
}: {
  editor: Editor
  uploading: boolean
  onFileSelect: () => void
  onSetLink: () => void
  onInsertYoutube: () => void
}) {
  return (
    <div className="editor-toolbar flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-2 py-1.5">
      {/* Text formatting */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fett (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Unterstrichen (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Durchgestrichen"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Block type */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive("paragraph") && !editor.isActive("heading")}
          title="Absatz"
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Überschrift 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Überschrift 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Colors */}
      <ToolbarGroup>
        <ColorPickerButton
          editor={editor}
          type="color"
          colors={TEXT_COLORS}
          title="Textfarbe"
          icon={<Palette className="h-4 w-4" />}
        />
        <ColorPickerButton
          editor={editor}
          type="highlight"
          colors={HIGHLIGHT_COLORS}
          title="Hervorhebung"
          icon={<Highlighter className="h-4 w-4" />}
        />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Superscript/Subscript */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive("superscript")}
          title="Hochgestellt"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive("subscript")}
          title="Tiefgestellt"
        >
          <SubscriptIcon className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Links ausrichten"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Zentrieren"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Rechts ausrichten"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Blocksatz"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Aufzählung"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Nummerierte Liste"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive("taskList")}
          title="Checkliste"
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Zitat"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code-Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Trennlinie">
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarGroup>
        <ToolbarButton onClick={onSetLink} active={editor.isActive("link")} title="Link einfügen">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onFileSelect} title="Bild hochladen" disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </ToolbarButton>
        <TableInsertButton editor={editor} />
        <ToolbarButton onClick={onInsertYoutube} title="YouTube-Video">
          <YoutubeIcon className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Clear formatting */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Formatierung entfernen"
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      {/* Spacer */}
      <div className="flex-1" />

      {/* History */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Rückgängig (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Wiederholen (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table Context Toolbar
// ---------------------------------------------------------------------------
function TableContextToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="table-context-toolbar flex flex-wrap items-center gap-1 border-b border-input bg-accent/5 px-3 py-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-1 select-none flex items-center gap-1">
        <TableIcon className="h-3 w-3" />
        Tabelle
      </span>

      <TableActionButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Zeile davor einfügen">
        ↑ Zeile
      </TableActionButton>
      <TableActionButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Zeile danach einfügen">
        ↓ Zeile
      </TableActionButton>
      <TableActionButton
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Zeile löschen"
        variant="destructive"
      >
        ✕ Zeile
      </TableActionButton>

      <span className="mx-1 h-4 w-px bg-border" />

      <TableActionButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Spalte davor einfügen">
        ← Spalte
      </TableActionButton>
      <TableActionButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Spalte danach einfügen">
        → Spalte
      </TableActionButton>
      <TableActionButton
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Spalte löschen"
        variant="destructive"
      >
        ✕ Spalte
      </TableActionButton>

      <span className="mx-1 h-4 w-px bg-border" />

      <TableActionButton onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Kopfzeile umschalten">
        Kopfzeile
      </TableActionButton>
      <TableActionButton onClick={() => editor.chain().focus().mergeCells().run()} title="Zellen verbinden">
        Verbinden
      </TableActionButton>
      <TableActionButton onClick={() => editor.chain().focus().splitCell().run()} title="Zelle teilen">
        Teilen
      </TableActionButton>

      <div className="flex-1" />

      <TableActionButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Tabelle löschen"
        variant="destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Löschen
      </TableActionButton>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color Picker Dropdown
// ---------------------------------------------------------------------------
function ColorPickerButton({
  editor,
  type,
  colors,
  title,
  icon,
}: {
  editor: Editor
  type: "color" | "highlight"
  colors: { name: string; value: string }[]
  title: string
  icon: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isActive = type === "color" ? editor.isActive("textStyle") : editor.isActive("highlight")

  const currentColor =
    type === "color" ? (editor.getAttributes("textStyle").color ?? "") : (editor.getAttributes("highlight").color ?? "")

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const applyColor = (value: string) => {
    if (type === "color") {
      if (value === "") {
        editor.chain().focus().unsetColor().run()
      } else {
        editor.chain().focus().setColor(value).run()
      }
    } else {
      if (value === "") {
        editor.chain().focus().unsetHighlight().run()
      } else {
        editor.chain().focus().setHighlight({ color: value }).run()
      }
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={title}
        className={cn(
          "flex h-7 items-center gap-0.5 rounded px-1 transition-colors",
          isActive
            ? "bg-accent/20 text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="relative">
          {icon}
          {currentColor && (
            <span
              className="absolute -bottom-0.5 left-0.5 right-0.5 h-0.5 rounded-full"
              style={{ background: currentColor }}
            />
          )}
        </span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[160px]">
          <div className="grid grid-cols-4 gap-1.5">
            {colors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => applyColor(color.value)}
                title={color.name}
                className={cn(
                  "h-6 w-6 rounded-md border transition-all hover:scale-110",
                  color.value === currentColor && "ring-2 ring-offset-1 ring-accent",
                  color.value === "" && "flex items-center justify-center",
                )}
                style={{
                  background: color.value || "transparent",
                  borderColor: color.value ? `${color.value}80` : "hsl(var(--border))",
                }}
              >
                {color.value === "" && <span className="text-[10px] text-muted-foreground">⊘</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table Insert with Grid Picker
// ---------------------------------------------------------------------------
function TableInsertButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleInsert = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setOpen(false)
    setHoverRow(0)
    setHoverCol(0)
  }

  return (
    <div ref={ref} className="relative">
      <ToolbarButton onClick={() => setOpen(!open)} title="Tabelle einfügen">
        <TableIcon className="h-4 w-4" />
      </ToolbarButton>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-2.5">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 6 }, (_, col) => (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={cn(
                    "h-[18px] w-[18px] border rounded-[3px] transition-colors",
                    row <= hoverRow && col <= hoverCol
                      ? "bg-accent/40 border-accent/60"
                      : "bg-background border-border",
                  )}
                  onMouseEnter={() => {
                    setHoverRow(row)
                    setHoverCol(col)
                  }}
                  onClick={() => handleInsert(row + 1, col + 1)}
                />
              )),
            )}
          </div>
          <div className="text-center text-[11px] text-muted-foreground mt-1.5 select-none">
            {hoverCol + 1} × {hoverRow + 1} Tabelle
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drop Overlay
// ---------------------------------------------------------------------------
function DropOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-accent/5 border-2 border-dashed border-accent/40 rounded-b-lg backdrop-blur-[1px] pointer-events-none">
      <div className="flex flex-col items-center gap-2 text-accent-foreground/70 animate-pulse">
        <Upload className="h-8 w-8" />
        <span className="text-sm font-medium">Bild hier ablegen</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload Progress Indicator
// ---------------------------------------------------------------------------
function UploadingOverlay() {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-popover border border-border rounded-lg shadow-lg px-3 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-accent-foreground" />
      <span className="text-xs font-medium text-muted-foreground">Wird hochgeladen…</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------
function StatusBar({ charCount }: { charCount: { characters: () => number; words: () => number } }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-input bg-muted/20 px-3 py-1">
      <span className="text-[11px] text-muted-foreground tabular-nums">{charCount.words()} Wörter</span>
      <span className="text-[11px] text-muted-foreground tabular-nums">{charCount.characters()} Zeichen</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar helpers
// ---------------------------------------------------------------------------
function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  size = "default",
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
  size?: "default" | "sm"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex items-center justify-center rounded transition-colors",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
        active ? "bg-accent/20 text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border/60" />
}

function TableActionButton({
  onClick,
  title,
  children,
  variant,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  variant?: "destructive"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-0.5 rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
        variant === "destructive"
          ? "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
