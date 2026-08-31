import { describe, expect, it } from 'vitest'
import type { ItemCategory } from 'pokenode-ts'
import type { ItemEntry } from '@/api/queries/items'
import { categoriesIn, filterItems, indexItems } from './filter'

function link(id: number, name: string) {
  return { name, url: `https://pokeapi.co/api/v2/item/${id}/` }
}

const INDEX: ItemEntry[] = [
  { id: 1, name: 'master-ball' },
  { id: 17, name: 'potion' },
  { id: 234, name: 'metal-coat' },
]

const CATEGORIES = [
  {
    name: 'standard-balls',
    pocket: { name: 'pokeballs', url: '' },
    items: [link(1, 'master-ball')],
  },
  { name: 'healing', pocket: { name: 'medicine', url: '' }, items: [link(17, 'potion')] },
  {
    name: 'type-enhancement',
    pocket: { name: 'misc', url: '' },
    items: [link(234, 'metal-coat')],
  },
] as unknown as ItemCategory[]

const ROWS = indexItems(INDEX, CATEGORIES)

describe('indexItems', () => {
  it('reads the category and its pocket off the resource that carries the item', () => {
    expect(ROWS.find((row) => row.name === 'potion')).toMatchObject({
      category: 'healing',
      pocket: 'medicine',
    })
  })

  it('leaves both absent until the reference query lands', () => {
    expect(indexItems(INDEX, undefined)[0]).toEqual({
      id: 1,
      name: 'master-ball',
      category: undefined,
      pocket: undefined,
    })
  })
})

describe('filterItems', () => {
  it('returns everything when nothing is asked for', () => {
    expect(filterItems(ROWS, '', '', '')).toHaveLength(3)
  })

  it('intersects the filters', () => {
    expect(filterItems(ROWS, '', 'medicine', 'healing').map((row) => row.name)).toEqual(['potion'])
  })

  it('matches a typed space against the slug', () => {
    expect(filterItems(ROWS, 'metal coat', '', '').map((row) => row.name)).toEqual(['metal-coat'])
  })

  it('keeps a row whose category has not resolved rather than dropping it', () => {
    expect(filterItems(indexItems(INDEX, undefined), '', 'medicine', '')).toHaveLength(3)
  })

  it('answers nothing when a filter genuinely excludes everything', () => {
    expect(filterItems(ROWS, '', 'berries', '')).toEqual([])
  })
})

describe('categoriesIn', () => {
  it('narrows to one pocket', () => {
    expect(categoriesIn(CATEGORIES, 'medicine')).toEqual(['healing'])
  })

  it('names every category when no pocket is chosen', () => {
    expect(categoriesIn(CATEGORIES, '')).toEqual(['healing', 'standard-balls', 'type-enhancement'])
  })

  it('answers nothing before the query lands', () => {
    expect(categoriesIn(undefined, 'medicine')).toEqual([])
  })
})
