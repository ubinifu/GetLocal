import type { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800',
  },
  CONFIRMED: {
    label: 'Confirmed',
    classes: 'bg-blue-100 text-blue-800',
  },
  PREPARING: {
    label: 'Preparing',
    classes: 'bg-indigo-100 text-indigo-800',
  },
  READY: {
    label: 'Ready for Pickup',
    classes: 'bg-green-100 text-green-800',
  },
  PICKED_UP: {
    label: 'Picked Up',
    classes: 'bg-gray-100 text-gray-800',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
