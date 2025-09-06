import React from 'react';

interface PageProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

const Page: React.FC<PageProps> = ({ 
  children, 
  title, 
  description, 
  actions,
  className = '' 
}) => {
  return (
    <div className={`min-h-full ${className}`}>
      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-4 flex md:mt-0 md:ml-4">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Page;
