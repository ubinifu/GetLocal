import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import type { Order } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';

interface OrderCardProps {
  order: Order;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function OrderCard({ order }: OrderCardProps) {
  const itemCount = order.items?.length ?? 0;

  return (
    <Link
      to={`/orders/${order.id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <Package className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Order #{order.orderNumber}
              </h3>
              <StatusBadge status={order.status} />
            </div>
            {order.store && (
              <p className="mt-0.5 text-sm text-gray-600 truncate">
                {order.store.name}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="hidden sm:inline">&middot;</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-base font-semibold text-gray-900">
            ${Number(order.total).toFixed(2)}
          </span>
          <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
