import React, { useState } from 'react';
import { CampaignSettings, OfferDefinition } from '../types';
import { Check, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  settings: CampaignSettings;
  offers: OfferDefinition[];
  onConfirmRealStart: (updatedSettings: CampaignSettings, updatedOffers: OfferDefinition[]) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  settings,
  offers,
  onConfirmRealStart,
}) => {
  const [step, setStep] = useState<number>(1);
  const [formSettings, setFormSettings] = useState<CampaignSettings>({
    ...settings,
    onboardingCompleted: true,
  });
  const [formOffers, setFormOffers] = useState<OfferDefinition[]>(offers.map((o) => ({ ...o })));

  const totalAllocation =
    formSettings.protectedReserve +
    formSettings.operatingBudget +
    formSettings.salesAssetsBudget +
    formSettings.adTestBudget +
    formSettings.contingencyBudget +
    formSettings.essentialLivingProtectedAmount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 shadow-2xl my-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono text-sky-400">
              It&apos;s LLC · 30-Day Execution Operating System · Step {step} of 4
            </p>
            <h1 id="onboarding-title" className="text-2xl font-bold text-slate-100 mt-1">
              Campaign Setup
            </h1>
          </div>
          <button
            type="button"
            onClick={() => onConfirmRealStart(formSettings, formOffers)}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip Setup &rarr;
          </button>
        </div>

        {/* Step 1: Start Date & Operator Identity */}
        {step === 1 && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-start-date" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Campaign Start Date
                </label>
                <input
                  id="onb-start-date"
                  type="date"
                  value={formSettings.startDate}
                  onChange={(e) => setFormSettings({ ...formSettings, startDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono"
                />
              </div>

              <div>
                <label htmlFor="onb-operator-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Your Name
                </label>
                <input
                  id="onb-operator-name"
                  type="text"
                  value={formSettings.operatorName}
                  onChange={(e) => setFormSettings({ ...formSettings, operatorName: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="onb-niche" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Niche
                </label>
                <input
                  id="onb-niche"
                  type="text"
                  value={formSettings.selectedNiche}
                  onChange={(e) => setFormSettings({ ...formSettings, selectedNiche: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="onb-demo-url" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Demonstration Build URL
                </label>
                <input
                  id="onb-demo-url"
                  type="text"
                  value={formSettings.demoSiteUrl}
                  onChange={(e) => setFormSettings({ ...formSettings, demoSiteUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Working Capital & Protected Cash Reserves */}
        {step === 2 && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="onb-cap-total" className="block text-xs font-medium text-slate-300 mb-1">
                  Starting Working Capital ($)
                </label>
                <input
                  id="onb-cap-total"
                  type="number"
                  value={formSettings.startingWorkingCapital}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, startingWorkingCapital: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="onb-cap-reserve" className="block text-xs font-medium text-emerald-400 mb-1">
                  Protected Reserve ($)
                </label>
                <input
                  id="onb-cap-reserve"
                  type="number"
                  value={formSettings.protectedReserve}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, protectedReserve: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-emerald-800/80 rounded-lg text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="onb-cap-living" className="block text-xs font-medium text-amber-300 mb-1">
                  Additional Essential Living Protection ($)
                </label>
                <input
                  id="onb-cap-living"
                  type="number"
                  value={formSettings.essentialLivingProtectedAmount}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      essentialLivingProtectedAmount: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-800/80 rounded-lg text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="onb-cap-operating" className="block text-xs font-medium text-slate-300 mb-1">
                  Delivery &amp; Operating Budget ($)
                </label>
                <input
                  id="onb-cap-operating"
                  type="number"
                  value={formSettings.operatingBudget}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, operatingBudget: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="onb-cap-sales" className="block text-xs font-medium text-slate-300 mb-1">
                  Sales Assets &amp; Prospecting ($)
                </label>
                <input
                  id="onb-cap-sales"
                  type="number"
                  value={formSettings.salesAssetsBudget}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, salesAssetsBudget: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="onb-cap-ads" className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Ad Test ($)
                </label>
                <input
                  id="onb-cap-ads"
                  type="number"
                  value={formSettings.adTestBudget}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, adTestBudget: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
              <span>
                Total Allocated Buckets (incl. $1,000 Contingency):{' '}
                <strong className="text-slate-100">${totalAllocation.toLocaleString()}</strong> / $
                {formSettings.startingWorkingCapital.toLocaleString()}
              </span>
              <span className="text-emerald-400">
                Protected + Contingency Shield: $
                {(
                  formSettings.protectedReserve +
                  formSettings.contingencyBudget +
                  formSettings.essentialLivingProtectedAmount
                ).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Revenue Streams & Offer Assumptions */}
        {step === 3 && (
          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              {formOffers.map((offer, idx) => (
                <div key={offer.id} className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{offer.name}</h3>
                      <p className="text-xs text-slate-400">{offer.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>Price ($):</span>
                        <input
                          type="number"
                          value={offer.price}
                          onChange={(e) => {
                            const next = [...formOffers];
                            next[idx] = { ...offer, price: Number(e.target.value) || 0 };
                            setFormOffers(next);
                          }}
                          className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>Target Units:</span>
                        <input
                          type="number"
                          value={offer.targetUnitSales}
                          onChange={(e) => {
                            const next = [...formOffers];
                            next[idx] = { ...offer, targetUnitSales: Number(e.target.value) || 0 };
                            setFormOffers(next);
                          }}
                          className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-900">
                    <span>Payment rule: {offer.paymentStructure}</span>
                    <span className="font-mono text-sky-400">
                      Target Contribution: ${(offer.price * offer.targetUnitSales).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Daily Activity & Capacity Targets */}
        {step === 4 && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="onb-daily-calls" className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Call Target
                </label>
                <input
                  id="onb-daily-calls"
                  type="number"
                  value={formSettings.dailyCallTarget}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, dailyCallTarget: Number(e.target.value) || 20 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="onb-daily-followups" className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Follow-Ups Target
                </label>
                <input
                  id="onb-daily-followups"
                  type="number"
                  value={formSettings.dailyFollowUpTarget}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, dailyFollowUpTarget: Number(e.target.value) || 5 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="onb-capacity" className="block text-xs font-medium text-slate-300 mb-1">
                  Max Concurrent Active Builds
                </label>
                <input
                  id="onb-capacity"
                  type="number"
                  value={formSettings.maxConcurrentActiveProjects}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      maxConcurrentActiveProjects: Number(e.target.value) || 4,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between gap-4">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConfirmRealStart(formSettings, formOffers)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Launch Command Center</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
