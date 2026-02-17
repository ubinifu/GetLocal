import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4">
      <div className="mx-auto max-w-md text-center">
        {/* 404 Illustration */}
        <div className="relative mx-auto h-48 w-48">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[120px] font-bold leading-none text-gray-100">404</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-green-100 p-5">
              <Search size={48} className="text-green-600" />
            </div>
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-600">
          Sorry, we could not find the page you are looking for. It may have been moved, deleted,
          or the URL might be incorrect.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-green-700 sm:w-auto"
          >
            <Home size={18} />
            Go to home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            <ArrowLeft size={18} />
            Go back
          </button>
        </div>

        <div className="mt-10 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            Looking for something specific? Try browsing our{' '}
            <Link to="/stores" className="font-medium text-green-600 hover:text-green-700">
              stores
            </Link>{' '}
            or go back to the{' '}
            <Link to="/" className="font-medium text-green-600 hover:text-green-700">
              homepage
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
