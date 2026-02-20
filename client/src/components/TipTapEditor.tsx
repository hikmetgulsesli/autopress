import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { useCallback } from 'react';

interface TipTapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ content = '', onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-400 underline hover:text-primary-300',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-zinc max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const toolbarButton = (
    onClick: () => void,
    isActive: boolean,
    icon: React.ReactNode,
    label: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`
        p-2 rounded-md transition-all duration-150
        cursor-pointer
        ${isActive 
          ? 'bg-primary-400/20 text-primary-400' 
          : 'text-text-muted hover:text-text hover:bg-surface-alt'
        }
        focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
      `}
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface-alt">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-border bg-surface">
        {/* History */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          {toolbarButton(
            () => editor.chain().focus().undo().run(),
            false,
            <Undo className="w-4 h-4" />,
            'Geri al'
          )}
          {toolbarButton(
            () => editor.chain().focus().redo().run(),
            false,
            <Redo className="w-4 h-4" />,
            'İleri al'
          )}
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          {toolbarButton(
            () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            editor.isActive('heading', { level: 1 }),
            <Heading1 className="w-4 h-4" />,
            'Başlık 1'
          )}
          {toolbarButton(
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            editor.isActive('heading', { level: 2 }),
            <Heading2 className="w-4 h-4" />,
            'Başlık 2'
          )}
        </div>

        {/* Formatting */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          {toolbarButton(
            () => editor.chain().focus().toggleBold().run(),
            editor.isActive('bold'),
            <Bold className="w-4 h-4" />,
            'Kalın'
          )}
          {toolbarButton(
            () => editor.chain().focus().toggleItalic().run(),
            editor.isActive('italic'),
            <Italic className="w-4 h-4" />,
            'İtalik'
          )}
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          {toolbarButton(
            () => editor.chain().focus().toggleBulletList().run(),
            editor.isActive('bulletList'),
            <List className="w-4 h-4" />,
            'Madde Listesi'
          )}
          {toolbarButton(
            () => editor.chain().focus().toggleOrderedList().run(),
            editor.isActive('orderedList'),
            <ListOrdered className="w-4 h-4" />,
            'Numaralı Liste'
          )}
        </div>

        {/* Link */}
        <div className="flex items-center gap-1 pl-2">
          {toolbarButton(
            setLink,
            editor.isActive('link'),
            <LinkIcon className="w-4 h-4" />,
            'Bağlantı Ekle'
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent editor={editor} />
        {placeholder && editor.isEmpty && (
          <div className="absolute top-3 left-4 text-text-muted pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
