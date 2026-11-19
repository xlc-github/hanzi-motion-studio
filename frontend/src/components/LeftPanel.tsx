import { useState } from 'react'
import { useStudioStore } from '@/store/useStudioStore'
import { extractHanzi, uniqueChars, PRESET_LESSONS } from '@/lib/textUtils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LibraryPanel } from '@/components/LibraryPanel'
import { Plus, Trash2, Check, BookOpen, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LeftPanel() {
  const [text, setText] = useState('')
  const chars = useStudioStore((s) => s.chars)
  const currentIndex = useStudioStore((s) => s.currentIndex)
  const addChars = useStudioStore((s) => s.addChars)
  const removeChar = useStudioStore((s) => s.removeChar)
  const clearChars = useStudioStore((s) => s.clearChars)
  const selectChar = useStudioStore((s) => s.selectChar)
  const reorderChars = useStudioStore((s) => s.reorderChars)

  const handleAdd = async () => {
    const extracted = uniqueChars(extractHanzi(text))
    if (!extracted.length) return
    await addChars(extracted)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  const handlePreset = async (lessonChars: string[]) => {
    await addChars(uniqueChars(extractHanzi(lessonChars.join(''))))
  }

  return (
    <Tabs defaultValue="editor" className="flex h-full flex-col">
      <TabsList className="m-3 mb-0 grid grid-cols-2">
        <TabsTrigger value="editor">生字编辑</TabsTrigger>
        <TabsTrigger value="library">资料库</TabsTrigger>
      </TabsList>
      <TabsContent value="editor" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* 输入区 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>输入生字</Label>
          <span className="text-[10px] text-muted-foreground">可粘贴课文</span>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入或粘贴汉字，自动去标点去重…"
          className="min-h-[72px]"
        />
        <Button onClick={handleAdd} className="w-full" size="sm" disabled={!text.trim()}>
          <Plus className="h-4 w-4" /> 添加到生字表
        </Button>
        <p className="text-[10px] text-muted-foreground">Ctrl / ⌘ + Enter 快速添加</p>
      </div>

      {/* 预设课文 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" /> 课文生字
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_LESSONS.map((lesson) => (
            <button
              key={lesson.name}
              onClick={() => handlePreset(lesson.chars)}
              className="truncate rounded-lg border border-border bg-white px-2 py-1.5 text-left text-[11px] hover:border-sage-300 hover:bg-sage-50"
              title={`载入 ${lesson.chars.join('、')}`}
            >
              {lesson.name}
            </button>
          ))}
        </div>
      </div>

      {/* 生字列表 */}
      <div className="flex min-h-0 flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between">
          <Label>生字表 ({chars.length})</Label>
          {chars.length > 0 && (
            <button
              onClick={clearChars}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" /> 清空
            </button>
          )}
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {chars.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
              还没有生字
              <br />
              在上方输入或选择课文
            </div>
          )}
          {chars.map((item, idx) => (
            <div
              key={item.char + idx}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const from = Number(e.dataTransfer.getData('text/plain'))
                if (!Number.isNaN(from)) reorderChars(from, idx)
              }}
              onClick={() => selectChar(idx)}
              className={cn(
                'group flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 transition-colors',
                idx === currentIndex
                  ? 'border-primary bg-sage-50'
                  : 'border-border bg-white hover:border-sage-200',
              )}
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              <span className="text-xl font-medium leading-none">{item.char}</span>
              <div className="ml-1 flex flex-col">
                <span className="text-[10px] text-muted-foreground">
                  {item.status === 'missing' ? (
                    <span className="text-amber-600">缺数据</span>
                  ) : item.status === 'ready' ? (
                    `${item.strokeCount} 笔`
                  ) : (
                    '校验中…'
                  )}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeChar(item.char)
                }}
                className="ml-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {idx === currentIndex && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          ))}
        </div>
      </div>

      {/* 底部全选导出提示 */}
      {chars.length > 0 && (
        <div className="rounded-lg bg-sage-50 p-2 text-[10px] leading-relaxed text-sage-700">
          在右侧「导出」中可选择批量导出全部 {chars.length} 个生字并打包下载。
        </div>
      )}
      </div>
      </TabsContent>
      <TabsContent value="library" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
        <LibraryPanel />
      </TabsContent>
    </Tabs>
  )
}
