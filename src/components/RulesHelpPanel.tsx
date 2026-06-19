import { useEffect, useRef } from 'react'
import type { RulesBlock, RulesChapter, RulesDocument } from '../content/odin-rules'

interface RulesHelpPanelProps {
  document: RulesDocument
  fallbackText?: string
}

function RulesBlockView({ block }: { block: RulesBlock }) {
  switch (block.type) {
    case 'heading':
      return <h4 className="rules-block-heading">{block.text}</h4>
    case 'paragraph':
      return <p className="rules-block-paragraph">{block.text}</p>
    case 'list':
      if (block.ordered) {
        return (
          <ol className="rules-block-list">
            {block.items?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        )
      }
      return (
        <ul className="rules-block-list">
          {block.items?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'example':
      return (
        <aside className="rules-block-example" aria-label="Example">
          {block.text}
        </aside>
      )
    case 'note':
      return <p className="rules-block-note">{block.text}</p>
    default:
      return null
  }
}

function RulesChapterView({ chapter }: { chapter: RulesChapter }) {
  return (
    <section id={chapter.id} className="rules-chapter" aria-labelledby={`${chapter.id}-title`}>
      <h3 id={`${chapter.id}-title`} className="rules-chapter-title">
        {chapter.title}
      </h3>
      {chapter.blocks.map((block, index) => (
        <RulesBlockView key={`${chapter.id}-${index}`} block={block} />
      ))}
    </section>
  )
}

export function RulesHelpPanel({ document, fallbackText }: RulesHelpPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [document])

  function scrollToChapter(id: string) {
    contentRef.current
      ?.querySelector(`#${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="rules-help-panel">
      <nav className="rules-help-toc" aria-label="Rules index">
        <p className="rules-help-toc-label">Index</p>
        <ol>
          {document.chapters.map((chapter) => (
            <li key={chapter.id}>
              <button type="button" onClick={() => scrollToChapter(chapter.id)}>
                {chapter.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div ref={contentRef} className="rules-help-content">
        {document.chapters.map((chapter) => (
          <RulesChapterView key={chapter.id} chapter={chapter} />
        ))}
        {fallbackText && (
          <section className="rules-fallback">
            <h3 className="rules-chapter-title">Profile notes</h3>
            <p className="rules-block-paragraph">{fallbackText}</p>
          </section>
        )}
      </div>
    </div>
  )
}
