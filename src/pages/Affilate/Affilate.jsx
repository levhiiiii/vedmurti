import { FiArrowRight, FiDollarSign, FiUsers, FiBarChart2, FiAward } from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

const AffiliateHero = () => {
  const stats = [
    { value: "10,000+", label: "Active Affiliates", icon: <FiUsers className="text-2xl" /> },
    { value: "₹5 Cr+", label: "Paid to Affiliates", icon: <BiRupee className="text-2xl" /> },
    { value: "30%", label: "Average Commission", icon: <FiBarChart2 className="text-2xl" /> },
    { value: "24/7", label: "Support", icon: <FiAward className="text-2xl" /> },
  ];

  const navigate = useNavigate();

  return (
    <section className="relative bg-gradient-to-br md:pt-0 md:px-20  pt-15 from-green-600 to-green-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="affiliate-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="white" opacity="0.3" />
              <circle cx="10" cy="10" r="0.5" fill="white" opacity="0.6" />
              <path d="M10,7 L10,13 M7,10 L13,10" stroke="white" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#affiliate-pattern)" />
        </svg>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-400 rounded-full opacity-20"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-300 rounded-full opacity-20"></div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left Content */}
          <div className="lg:w-1/2 w-full text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full mb-4 mx-auto lg:mx-0">
              <FiAward className="mr-2" />
              <span className="text-sm font-medium">Top Performing Affiliate Program</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Earn Money By Sharing <span className="text-green-200">Noni Products</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-green-100 mb-8 max-w-2xl mx-auto lg:mx-0">
              Join our affiliate program and earn up to 30% commission on every sale.
              No experience needed – we provide all the tools and support to help you succeed.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mb-10">
              <button
              onClick={() => navigate('/affilate-dashboard')}
              className="bg-white text-green-700 hover:bg-green-50 font-semibold px-6 py-3 sm:px-8 sm:py-4 rounded-lg flex items-center justify-center transition duration-300 shadow-lg hover:shadow-xl">
                Join Now <FiArrowRight className="ml-2" />
              </button>
              <button className="bg-transparent border-2 border-white hover:bg-white/10 font-semibold px-6 py-3 sm:px-8 sm:py-4 rounded-lg flex items-center justify-center transition duration-300">
                How It Works
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-start justify-center text-center sm:text-left gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img
                    key={i}
                    src={`/images/avatars/avatar-${i}.jpg`}
                    alt={`Affiliate ${i}`}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-medium">Trusted by 10,000+ affiliates worldwide</p>
                <div className="flex justify-center sm:justify-start items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm ml-1">5.0 (2,500+ reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image/Widget */}
          <div className="lg:w-1/2 w-full mt-10 lg:mt-0">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-1 shadow-2xl">
              <div className="bg-white rounded-xl overflow-hidden">
                <img
                  src="/images/affiliate-dashboard.png"
                  alt="Affiliate Dashboard Preview"
                  className="w-full h-auto object-contain"
                />
                <div className="p-6 bg-gradient-to-r from-green-600 to-green-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-100 text-sm">Your estimated earnings</p>
                      <p className="text-2xl font-bold">₹1,24,550</p>
                    </div>
                    <button className="bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute -bottom-6 -left-6 bg-white text-green-800 p-4 rounded-xl shadow-lg w-36 sm:w-40">
                <div className="flex items-center mb-2">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <FiUsers className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Referrals</p>
                    <p className="font-bold">142</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white text-green-800 p-4 rounded-xl shadow-lg w-36 sm:w-40">
                <div className="flex items-center mb-2">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <FiDollarSign className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Conversion</p>
                    <p className="font-bold">8.5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 flex items-center">
              <div className="bg-white/20 p-3 rounded-lg mr-4">
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-green-100">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AffiliateHero;
