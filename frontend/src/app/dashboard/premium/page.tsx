'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, Building2, RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:34002';

interface PlanInfo {
  name: string;
  max_bots: number;
  max_auto: number;
  price: string;
}

const plans: (PlanInfo & { popular?: boolean; icon: React.ReactNode })[] = [
  {
    name: 'Free',
    max_bots: 2,
    max_auto: 100,
    price: 'Rp 0',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    name: 'Pro',
    max_bots: 10,
    max_auto: 1000,
    price: 'Rp 49.000/mo',
    popular: true,
    icon: <Crown className="h-6 w-6" />,
  },
  {
    name: 'Enterprise',
    max_bots: 999,
    max_auto: 99999,
    price: 'Rp 149.000/mo',
    icon: <Building2 className="h-6 w-6" />,
  },
];

export default function PremiumPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  async function fetchPlan() {
    try {
      const res = await fetch(`${API_BASE}/api/premium/status`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan || 'free');
      }
    } catch {
      setCurrentPlan('free');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlan();
  }, []);

  async function subscribe(plan: string) {
    try {
      // Midtrans integration placeholder
      const res = await fetch(`${API_BASE}/api/premium/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          alert('Payment integration coming soon. Plan: ' + plan);
        }
      } else {
        alert('Payment integration coming soon. Plan: ' + plan);
      }
    } catch {
      alert('Payment integration coming soon. Plan: ' + plan);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading plan status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            Premium
          </h2>
          <p className="text-muted-foreground">
            Current plan:{' '}
            <Badge variant={currentPlan === 'free' ? 'secondary' : currentPlan === 'pro' ? 'success' : 'warning'}>
              {currentPlan}
            </Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPlan}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isActive = currentPlan === plan.name.toLowerCase();
          return (
            <Card key={plan.name} className={`relative ${plan.popular ? 'border-yellow-600/50' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="warning" className="px-3">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground">
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {plan.max_bots >= 999 ? 'Unlimited' : plan.max_bots} bots
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {plan.max_auto.toLocaleString()} auto queries
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {plan.name === 'Free' ? 'Community support' : 'Priority support'}
                  </li>
                  {plan.name !== 'Free' && (
                    <li className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      Webhook notifications
                    </li>
                  )}
                  {plan.name === 'Enterprise' && (
                    <>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        Custom bot branding
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        API access
                      </li>
                    </>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={isActive ? 'outline' : plan.popular ? 'default' : 'outline'}
                  disabled={isActive}
                  onClick={() => subscribe(plan.name.toLowerCase())}
                >
                  {isActive ? 'Current Plan' : plan.name === 'Free' ? 'Downgrade' : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          Payments are processed securely via Midtrans. Cancel anytime.
        </CardContent>
      </Card>
    </div>
  );
}
