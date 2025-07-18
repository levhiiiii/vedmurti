// components/registration/FormInput.jsx

export const FormInput = ({
  label,
  id,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  icon: Icon,
  showPasswordToggle,
  onTogglePassword,
  as = 'input', // 'input' | 'select' | 'textarea'
  children,
  rows = 3,
  iconPosition = 'center',
  ...props
}) => {
  const baseClass = `block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${
    error ? 'border-red-500' : 'border-gray-300'
  } rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500`;

  const renderField = () => {
    switch (as) {
      case 'select':
        return (
          <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className={baseClass}
            {...props}
          >
            {children}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className={baseClass}
            {...props}
          />
        );
      default:
        return (
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={baseClass}
            {...props}
          />
        );
    }
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        {renderField()}
        {showPasswordToggle && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={onTogglePassword}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              {showPasswordToggle}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
