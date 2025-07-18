import { FaHeartbeat, FaLeaf, FaShieldAlt, FaRecycle,  FaBrain, FaBolt, FaRegSmile } from 'react-icons/fa';
import {  GiMuscleUp, GiBottleVapors } from 'react-icons/gi';
import {  MdHealing } from 'react-icons/md';
import { GiHerbsBundle } from 'react-icons/gi';

const BenefitsPage = () => {
  return (
    <div className="bg-green-50 pt-15 min-h-screen">
      {/* Hero Section */}
      <div className="bg-green-700 text-white py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">The Powerful Benefits of Noni Juice</h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto">
            Discover how Vedamurti’s pure Noni Juice can transform your health naturally.
          </p>
        </div>
      </div>

      {/* Main Benefits Section */}
      <div className="container mx-auto px-4 py-12">
        {/* Introduction */}
        <section className="mb-16 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 mb-4">
            <FaLeaf className="mr-2" />
            <span className="font-medium">Nature’s Miracle</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Noni Juice?</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            For centuries, Noni Juice has been revered in traditional medicine for its incredible health benefits. 
            Modern science now confirms what ancient Polynesians knew—Noni is packed with antioxidants, vitamins, 
            and bioactive compounds that support overall wellness.
          </p>
        </section>

        {/* Key Benefits Grid */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FaShieldAlt className="text-4xl text-green-600 mb-4" />,
                title: "Boosts Immunity",
                description: "Rich in antioxidants like scopoletin and quercetin, Noni Juice strengthens the immune system and helps fight infections."
              },
              {
                icon: <FaHeartbeat className="text-4xl text-green-600 mb-4" />,
                title: "Supports Heart Health",
                description: "Helps maintain healthy blood pressure and cholesterol levels, promoting cardiovascular wellness."
              },
              {
                icon: <GiHerbsBundle className="text-4xl text-green-600 mb-4" />,
                title: "Aids Digestion",
                description: "Contains enzymes that improve gut health, reduce bloating, and support a balanced digestive system."
              },
              {
                icon: <FaRecycle className="text-4xl text-green-600 mb-4" />,
                title: "Detoxifies the Body",
                description: "Helps cleanse the liver and kidneys, removing toxins and improving metabolic function."
              },
              {
                icon: <FaBolt className="text-4xl text-green-600 mb-4" />,
                title: "Enhances Energy",
                description: "Noni Juice increases stamina and reduces fatigue, making it ideal for athletes and busy lifestyles."
              },
              {
                icon: <FaBrain className="text-4xl text-green-600 mb-4" />,
                title: "Improves Mental Clarity",
                description: "Supports brain function, reduces stress, and may help with focus and memory retention."
              },
              {
                icon: <GiMuscleUp className="text-4xl text-green-600 mb-4" />,
                title: "Reduces Inflammation",
                description: "Powerful anti-inflammatory properties help with joint pain, arthritis, and muscle recovery."
              },
              {
                icon: <MdHealing className="text-4xl text-green-600 mb-4" />,
                title: "Promotes Skin Health",
                description: "Rich in collagen-boosting compounds, Noni Juice helps reduce acne, eczema, and signs of aging."
              },
              {
                icon: <FaRegSmile className="text-4xl text-green-600 mb-4" />,
                title: "Enhances Mood",
                description: "Supports serotonin production, helping reduce anxiety and promoting emotional balance."
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-center">{benefit.icon}</div>
                <h3 className="text-xl font-semibold text-center mb-3 text-gray-800">{benefit.title}</h3>
                <p className="text-gray-600 text-center">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Scientific Backing */}
        <section className="bg-white rounded-xl shadow-md p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">What Science Says About Noni Juice</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-700">Key Research Findings</h3>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>A <strong>University of Hawaii study</strong> found Noni Juice reduces oxidative stress by 30%.</li>
                <li><strong>Clinical trials</strong> suggest Noni helps maintain normal blood sugar levels.</li>
                <li>Research in the <strong>Journal of Medicinal Food</strong> highlights its anti-inflammatory effects.</li>
                <li>A <strong>2019 study</strong> showed improved endurance in athletes consuming Noni Juice.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-700">Key Nutrients in Noni</h3>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li><strong>Iridoids</strong> (powerful antioxidants)</li>
                <li><strong>Scopoletin</strong> (supports circulation)</li>
                <li><strong>Xeronine</strong> (aids cellular repair)</li>
                <li><strong>Vitamin C & Potassium</strong> (boosts immunity)</li>
                <li><strong>Anthraquinones</strong> (natural antibacterial agents)</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-gray-500 italic">
            *These statements are based on traditional use and preliminary research. Noni Juice is not intended to diagnose, treat, or cure any disease.
          </div>
        </section>

        {/* How to Use for Maximum Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">How to Use Noni Juice for Best Results</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <GiBottleVapors className="text-4xl text-green-600 mb-4" />,
                title: "Optimal Dosage",
                content: "Take 30-60ml daily, preferably on an empty stomach for better absorption."
              },
              {
                icon: <FaLeaf className="text-4xl text-green-600 mb-4" />,
                title: "Consistency is Key",
                content: "For best results, use daily for at least 3 months to experience full benefits."
              },
              {
                icon: <MdHealing className="text-4xl text-green-600 mb-4" />,
                title: "Pair with Healthy Habits",
                content: "Enhance results by staying hydrated, eating clean, and managing stress."
              }
            ].map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="flex justify-center">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-green-700">{item.title}</h3>
                <p className="text-gray-600">{item.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-green-100 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Experience the Benefits?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Try Vedamurti’s pure, cold-pressed Noni Juice today and start your journey to better health.
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg">
            Shop Noni Juice Now
          </button>
        </section>
      </div>
    </div>
  );
};

export default BenefitsPage;