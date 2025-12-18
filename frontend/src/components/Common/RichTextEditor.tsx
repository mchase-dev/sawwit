import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button, Space } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  CodeOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write your content here...',
  minHeight = 200,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    // Cancelled
    if (url === null) return;

    // Empty - remove link
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor-toolbar">
        <Space size="small" wrap>
          <Button
            size="small"
            icon={<BoldOutlined />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            type={editor.isActive('bold') ? 'primary' : 'default'}
            title="Bold (Ctrl+B)"
          />
          <Button
            size="small"
            icon={<ItalicOutlined />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            type={editor.isActive('italic') ? 'primary' : 'default'}
            title="Italic (Ctrl+I)"
          />
          <Button
            size="small"
            icon={<StrikethroughOutlined />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            type={editor.isActive('strike') ? 'primary' : 'default'}
            title="Strikethrough"
          />
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={() => editor.chain().focus().toggleCode().run()}
            type={editor.isActive('code') ? 'primary' : 'default'}
            title="Inline Code"
          />

          <div style={{ width: 1, height: 24, backgroundColor: '#d9d9d9', margin: '0 4px' }} />

          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            type={editor.isActive('bulletList') ? 'primary' : 'default'}
            title="Bullet List"
          />
          <Button
            size="small"
            icon={<OrderedListOutlined />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            type={editor.isActive('orderedList') ? 'primary' : 'default'}
            title="Numbered List"
          />

          <div style={{ width: 1, height: 24, backgroundColor: '#d9d9d9', margin: '0 4px' }} />

          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={setLink}
            type={editor.isActive('link') ? 'primary' : 'default'}
            title="Insert Link"
          />

          <div style={{ width: 1, height: 24, backgroundColor: '#d9d9d9', margin: '0 4px' }} />

          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          />
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          />
        </Space>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};
