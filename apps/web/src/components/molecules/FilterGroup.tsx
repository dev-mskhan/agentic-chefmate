import { Checkbox } from '../atoms/Checkbox'

export function FilterGroup({ title, options, selected, onChange }: { title: string; options: string[]; selected: string[]; onChange: (value: string, checked: boolean) => void }) {
  return <fieldset className="grid gap-1"><legend className="mb-2 text-sm font-semibold">{title}</legend>{options.map((option) => <Checkbox key={option} checked={selected.includes(option)} onChange={(event) => onChange(option, event.target.checked)}>{option}</Checkbox>)}</fieldset>
}
