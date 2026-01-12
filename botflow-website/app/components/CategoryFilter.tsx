'use client';

interface Category {
  id: string;
  label: string;
  icon: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selected: string;
  onChange: (categoryId: string) => void;
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onChange(category.id)}
          className={`
            inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${
              selected === category.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }
          `}
        >
          <span className="mr-2">{category.icon}</span>
          {category.label}
        </button>
      ))}
    </div>
  );
}
