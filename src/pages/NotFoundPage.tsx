import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { buttonVariants } from '../components/ui/button-variants';

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<Compass size={28} />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={<Link to="/" className={buttonVariants()}>Go to dashboard</Link>}
      />
    </Card>
  );
}
