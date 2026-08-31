import { useQuery } from '@tanstack/react-query'
import { languagesQuery } from '@/api/queries/languages'
import { Select } from '@/components/ui/Select'
import { useLanguage } from '@/hooks/use-language'

export function LanguagePicker() {
  const [language, setLanguage] = useLanguage()
  const { data: languages } = useQuery(languagesQuery)

  return (
    <Select label="Text language" value={language} onChange={setLanguage} hideLabel size="micro">
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
    </Select>
  )
}
