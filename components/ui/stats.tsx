import React from 'react';

export default function StatsSection() {
  const stats = [
    {
      number: "10,000+",
      label: "Trips Managed Daily",
      subtext: "Across all platforms"
    },
    {
      number: "500+",
      label: "Cab Companies Trust Us",
      subtext: "Growing every day"
    },
    {
      number: "99.9%",
      label: "Uptime Guaranteed",
      subtext: "24/7 reliability"
    },
    {
      number: "50+",
      label: "Countries Worldwide",
      subtext: "And expanding"
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Join thousands of businesses revolutionizing their cab operations
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group"
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:-translate-y-2">
                <div className="text-5xl font-bold text-white mb-3 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-xl font-semibold text-white mb-2">
                  {stat.label}
                </div>
                <div className="text-blue-200 text-sm">
                  {stat.subtext}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}