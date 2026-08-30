import { useQuery } from '@tanstack/react-query'
import { languagesQuery } from '@/api/queries/languages'
import { useLanguage } from '@/lib/language'

export function LanguagePicker() {
  const [language, setLanguage] = useLanguage()
  const { data: languages } = useQuery(languagesQuery)

  return (
    <label className="flex items-center gap-1.5 text-micro text-ink-lo">
      <span className="sr-only">Text language</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="well cursor-pointer px-2 py-0.5 text-micro text-ink-mid"
      >
        {/* Present before the list arrives, so the control never appears empty. */}
        {languages ? (
          languages.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name}
            </option>
          ))
        ) : (
          <option value={language}>{language}</option>
        )}
      </select>
    </label>
  )
}
