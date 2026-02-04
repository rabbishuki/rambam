"use client";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Toggle<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: ToggleProps<T>) {
  return (
    <div
      className={`flex gap-1 bg-gray-100 p-1 rounded-lg ${className}`}
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex-1 px-3 py-2 text-sm font-medium rounded-md
            transition-all duration-200 cursor-pointer
            ${
              value === option.value
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
