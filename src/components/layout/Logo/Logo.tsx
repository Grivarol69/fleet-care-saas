import Link from 'next/link';
import { Truck } from 'lucide-react';

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center h-20 gap-2 border-b cursor-pointer min-h-20 px-6"
    >
      <Truck className="h-8 w-8 text-primary" />
      <h1 className="text-xl font-bold">Fleet Care</h1>
    </Link>
  );
}
