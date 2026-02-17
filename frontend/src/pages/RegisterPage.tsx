import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, UserPlus, Store, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role: 'CUSTOMER' | 'STORE_OWNER';
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storeState: string;
  storeZipCode: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'CUSTOMER',
    storeName: '',
    storeAddress: '',
    storeCity: '',
    storeState: '',
    storeZipCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        'Password must include uppercase, lowercase, and a number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.phone && !/^\+?[\d\s-()]{7,15}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.role === 'STORE_OWNER') {
      if (!formData.storeName.trim()) {
        newErrors.storeName = 'Store name is required';
      } else if (formData.storeName.trim().length < 2) {
        newErrors.storeName = 'Store name must be at least 2 characters';
      }
      if (!formData.storeAddress.trim()) {
        newErrors.storeAddress = 'Store address is required';
      }
      if (!formData.storeCity.trim()) {
        newErrors.storeCity = 'City is required';
      }
      if (!formData.storeState.trim()) {
        newErrors.storeState = 'State is required';
      } else if (formData.storeState.trim().length !== 2) {
        newErrors.storeState = 'Use 2-letter state code (e.g. NY)';
      }
      if (!formData.storeZipCode.trim()) {
        newErrors.storeZipCode = 'Zip code is required';
      } else if (!/^\d{5}$/.test(formData.storeZipCode.trim())) {
        newErrors.storeZipCode = 'Zip code must be 5 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitError('');
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        role: formData.role,
      };
      if (formData.role === 'STORE_OWNER') {
        payload.storeName = formData.storeName.trim();
        payload.storeAddress = formData.storeAddress.trim();
        payload.storeCity = formData.storeCity.trim();
        payload.storeState = formData.storeState.trim().toUpperCase();
        payload.storeZipCode = formData.storeZipCode.trim();
      }
      await register(payload as unknown as Parameters<typeof register>[0]);
      toast.success('Account created successfully!');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(message);
      toast.error(message);
    }
  };

  const inputClasses = (fieldName: string) =>
    `block w-full rounded-lg border py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
      errors[fieldName] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
            <UserPlus size={28} className="text-green-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Create an account</h1>
          <p className="mt-2 text-gray-600">
            Join GetLocal and start shopping from local stores.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl bg-white p-6 shadow-sm sm:p-8"
          noValidate
        >
          {submitError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Role Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">I am a</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, role: 'CUSTOMER' }))}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  formData.role === 'CUSTOMER'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <User size={18} />
                Customer
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, role: 'STORE_OWNER' }))}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  formData.role === 'STORE_OWNER'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Store size={18} />
                Store Owner
              </button>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClasses('firstName')}
                  placeholder="John"
                />
              </div>
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClasses('lastName')}
                  placeholder="Doe"
                />
              </div>
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="mt-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClasses('email')}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div className="mt-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone number <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Phone size={18} className="text-gray-400" />
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                className={inputClasses('phone')}
                placeholder="(555) 123-4567"
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Store Details (shown when Store Owner is selected) */}
          {formData.role === 'STORE_OWNER' && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
                <Store size={16} />
                Store Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                    Store name
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Store size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="storeName"
                      name="storeName"
                      type="text"
                      value={formData.storeName}
                      onChange={handleChange}
                      className={inputClasses('storeName')}
                      placeholder="My Corner Store"
                    />
                  </div>
                  {errors.storeName && (
                    <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700">
                    Street address
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MapPin size={18} className="text-gray-400" />
                    </div>
                    <input
                      id="storeAddress"
                      name="storeAddress"
                      type="text"
                      value={formData.storeAddress}
                      onChange={handleChange}
                      className={inputClasses('storeAddress')}
                      placeholder="123 Main Street"
                    />
                  </div>
                  {errors.storeAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.storeAddress}</p>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3">
                    <label htmlFor="storeCity" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      id="storeCity"
                      name="storeCity"
                      type="text"
                      value={formData.storeCity}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-lg border py-2.5 px-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                        errors.storeCity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Brooklyn"
                    />
                    {errors.storeCity && (
                      <p className="mt-1 text-sm text-red-600">{errors.storeCity}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="storeState" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <input
                      id="storeState"
                      name="storeState"
                      type="text"
                      maxLength={2}
                      value={formData.storeState}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-lg border py-2.5 px-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                        errors.storeState ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="NY"
                    />
                    {errors.storeState && (
                      <p className="mt-1 text-sm text-red-600">{errors.storeState}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="storeZipCode" className="block text-sm font-medium text-gray-700">
                      Zip code
                    </label>
                    <input
                      id="storeZipCode"
                      name="storeZipCode"
                      type="text"
                      maxLength={5}
                      value={formData.storeZipCode}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-lg border py-2.5 px-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                        errors.storeZipCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="11201"
                    />
                    {errors.storeZipCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.storeZipCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="mt-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className={`block w-full rounded-lg border py-2.5 pl-10 pr-10 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mt-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`block w-full rounded-lg border py-2.5 pl-10 pr-10 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create account
              </>
            )}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-700">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
