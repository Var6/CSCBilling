'use client';
import React, { useState } from 'react';
import { Check } from 'lucide-react';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small cab operators",
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        "Up to 5 vehicles",
        "Up to 10 drivers",
        "500 bookings/month",
        "Basic reporting",
        "Email support",
        "Mobile app access"
      ],
      popular: false
    },
    {
      name: "Professional",
      description: "For growing travel agencies",
      monthlyPrice: 79,
      annualPrice: 790,
      features: [
        "Up to 25 vehicles",
        "Up to 50 drivers",
        "Unlimited bookings",
        "Advanced analytics",
        "Priority support",
        "API access",
        "Custom branding",
        "GST invoicing"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large fleet operations",
      monthlyPrice: 199,
      annualPrice: 1990,
      features: [
        "Unlimited vehicles",
        "Unlimited drivers",
        "Unlimited bookings",
        "Real-time tracking",
        "Dedicated account manager",
        "Custom integrations",
        "White-label solution",
        "SLA guarantee",
        "Training & onboarding"
      ],
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your business. No hidden fees.
          </p>

          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                !isAnnual
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                isAnnual
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:-translate-y-2 ${
                plan.popular
                  ? 'border-blue-600 relative'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-green-600 mt-1">
                      Save ${(plan.monthlyPrice * 12 - plan.annualPrice)}
                    </p>
                  )}
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 mb-6 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Need a custom plan for your business?
          </p>
          <button className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            Contact Sales →
          </button>
        </div>
      </div>
    </section>
  );
}