import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Unlimited notes', 'Rich text editor', 'Pin & organize', 'Cloud sync'],
    notIncluded: ['AI Summarizer', 'Grammar Check', 'Voice to Text', 'PDF Export'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2,
    priceINR: 179,
    popular: true,
    features: ['Everything in Free', 'AI Summarizer (3 levels)', 'Grammar Check', 'Voice to Text', 'PDF Export', 'Priority support'],
    notIncluded: [],
  },
];

export default function Subscription() {
  const { user, updateUser } = useAuth();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <p className="text-muted-foreground">Unlock AI-powered features to supercharge your notes</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative glass-card rounded-2xl p-6 transition-all",
              plan.popular && "border-primary ring-2 ring-primary/20",
              user?.plan === plan.id && "bg-primary/5"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />Most Popular
              </div>
            )}

            <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-muted-foreground">/month</span>
              {plan.priceINR && <span className="text-sm text-muted-foreground ml-2">(₹{plan.priceINR})</span>}
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />{feature}
                </li>
              ))}
              {plan.notIncluded.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant={plan.popular ? 'premium' : 'outline'}
              className="w-full"
              disabled={user?.plan === plan.id}
              onClick={() => plan.id === 'pro' && updateUser({ plan: 'pro' })}
            >
              {user?.plan === plan.id ? 'Current Plan' : plan.id === 'pro' ? 'Upgrade to Pro' : 'Get Started'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
