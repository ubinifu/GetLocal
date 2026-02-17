import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo & Copyright */}
          <div className="text-center sm:text-left">
            <Link to="/" className="text-lg font-bold text-emerald-600">
              GetLocal
            </Link>
            <p className="mt-1 text-sm text-gray-500">
              &copy; {currentYear} GetLocal. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            <Link
              to="/about"
              className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
            >
              Contact
            </Link>
            <Link
              to="/terms"
              className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
            >
              Privacy
            </Link>
          </nav>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              aria-label="Facebook"
              className="text-gray-400 transition-colors hover:text-emerald-600"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="text-gray-400 transition-colors hover:text-emerald-600"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="text-gray-400 transition-colors hover:text-emerald-600"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
