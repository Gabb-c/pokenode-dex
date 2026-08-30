import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { typeVar } from '@/lib/types'

interface TypeChipProps {
  name: string
  /** Chips in a matchup grid are labels, not navigation. */
  asLink?: boolean
}

export function TypeChip({ name, asLink = true }: TypeChipProps) {
  const style = { '--t': typeVar(name) } as CSSProperties
  // The label always carries the type name: colour alone never identifies a type.
  const content = <span className="type-chip" style={style}>{name}</span>

  if (!asLink) return content
  return (
    <Link to="/types/$name" params={{ name }} className="rounded-full">
      {content}
    </Link>
  )
}
