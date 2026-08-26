export function CategorySelect({
  groups,
  name = "categoryId",
  defaultValue,
  value,
  onChange,
  required = true,
  className = "rounded-xl border px-3 py-2",
}: {
  groups: { label: string; parentId: string; children: { id: string; name: string }[] }[];
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  className?: string;
}) {
  const controlled = value !== undefined;
  return (
    <select
      name={name}
      required={required}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : (defaultValue ?? "")}
      onChange={onChange}
      className={className}
    >
      <option value="">Catégorie (obligatoire)</option>
      {groups.map((group) => (
        <optgroup key={group.parentId} label={group.label}>
          <option value={group.parentId}>{group.label} — tout le rayon</option>
          {group.children.map((child) => (
            <option key={child.id} value={child.id}>
              {group.label} › {child.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
