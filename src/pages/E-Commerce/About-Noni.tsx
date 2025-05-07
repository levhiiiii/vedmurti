import { FaLeaf, FaHistory, FaHeartbeat, FaFlask } from 'react-icons/fa';
import { GiHealthPotion, GiFruitTree, GiEnergyShield, GiStomach } from 'react-icons/gi';
import Fruit from '../../assets/Fruit.jpeg'
import { MdOutlineEnergySavingsLeaf } from 'react-icons/md';
import { IoMdBody } from 'react-icons/io';

const AboutNoniPage = () => {
  return (
    <div className="bg-green-50 pt-15 min-h-screen">
      {/* Hero Section */}
      <div className="bg-green-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <FaLeaf className="text-4xl text-green-300" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">The Miracle of Noni Juice</h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto">
            Discover the ancient Polynesian secret to health and longevity
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* What is Noni Section */}
        <section className="mb-16">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="lg:w-1/2">
              <img 
                src={Fruit}
                alt="Noni Fruit" 
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
            <div className="lg:w-1/2">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 mb-4">
                <GiFruitTree className="mr-2" />
                <span className="font-medium">Nature's Gift</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">What is Noni?</h2>
              <p className="text-gray-600 mb-4">
                Noni (Morinda citrifolia) is a tropical evergreen tree native to Southeast Asia and the Pacific Islands.
                For over 2,000 years, Polynesian healers have used all parts of the Noni plant - fruit, leaves, bark,
                and roots - for their remarkable health benefits.
              </p>
              <p className="text-gray-600 mb-6">
                The Noni fruit has a distinctive odor when ripe (often described as cheesy) and a bitter taste,
                which is why it's most commonly consumed as a juice. Our cold-pressing process preserves all the
                beneficial compounds while making it palatable.
              </p>
              <div className="bg-green-100 border-l-4 border-green-600 p-4">
                <p className="text-green-800 italic">
                  "Noni is considered one of the most important plants in traditional Polynesian medicine,
                  often referred to as the 'Queen of Medicinal Plants'."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Historical Use Section */}
        <section className="mb-16 bg-white rounded-xl shadow-md p-8">
          <div className="flex items-center mb-6">
            <FaHistory className="text-3xl text-green-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Historical Significance</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-700">Polynesian Tradition</h3>
              <p className="text-gray-600 mb-4">
                In traditional Polynesian culture, Noni was considered sacred. Ancient healers (kahunas)
                used it to treat a wide range of ailments from infections to digestive issues. It was also
                used as a general health tonic to boost energy and vitality.
              </p>
              <p className="text-gray-600">
                The fruit was often prepared by fermenting it in jars, which modern research suggests may
                have enhanced its beneficial properties.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-700">Global Recognition</h3>
              <p className="text-gray-600 mb-4">
                While Noni has been used for centuries in the Pacific Islands, it gained worldwide attention
                in the 1990s when scientific research began validating its traditional uses.
              </p>
              <p className="text-gray-600">
                Today, Noni juice is consumed globally as a natural health supplement, with Vedamurti being
                one of the few producers maintaining traditional preparation methods combined with modern
                quality standards.
              </p>
            </div>
          </div>
        </section>

        {/* Health Benefits Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 mb-4">
              <FaHeartbeat className="mr-2" />
              <span className="font-medium">Health Benefits</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Drink Noni Juice?</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Modern science has confirmed what traditional healers knew for centuries - Noni Juice is packed
              with beneficial compounds that support overall health.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
             {
                icon: <GiHealthPotion className="text-4xl text-green-600 mb-4" />,
                title: "Rich in Antioxidants",
                description: "Contains scopoletin, quercetin, and other antioxidants that combat free radicals and oxidative stress."
              },
              {
                icon: <FaHeartbeat className="text-4xl text-green-600 mb-4" />,
                title: "Supports Heart Health",
                description: "May help maintain healthy cholesterol levels and support normal blood pressure."
              },
              {
                icon: <GiEnergyShield className="text-4xl text-green-600 mb-4" />,
                title: "Boosts Immunity",
                description: "Stimulates white blood cell production and contains antibacterial compounds."
              },
              {
                icon: <GiStomach className="text-4xl text-green-600 mb-4" />,
                title: "Aids Digestion",
                description: "Contains enzymes that support gut health and may help with acid reflux."
              },
              {
                icon: <MdOutlineEnergySavingsLeaf className="text-4xl text-green-600 mb-4" />,
                title: "Increases Energy",
                description: "Many users report improved stamina and reduced fatigue with regular consumption."
              },
              {
                icon: <IoMdBody className="text-4xl text-green-600 mb-4" />,
                title: "Pain Relief",
                description: "Traditional use includes relief from joint pain and headaches."
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-center">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-center mb-3 text-gray-800">{benefit.title}</h3>
                <p className="text-gray-600 text-center">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Scientific Research Section */}
        <section className="bg-white rounded-xl shadow-md p-8 mb-16">
          <div className="flex items-center mb-6">
            <FaFlask className="text-3xl text-green-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Scientific Research</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-700">Key Compounds</h3>
              <p className="text-gray-600 mb-4">
                Noni contains over 160 beneficial phytochemicals including:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li><strong>Iridoids:</strong> Powerful anti-inflammatory compounds</li>
                <li><strong>Scopoletin:</strong> Helps regulate blood pressure</li>
                <li><strong>Proxeronine:</strong> Precursor to xeronine, important for cellular function</li>
                <li><strong>Anthraquinones:</strong> Have antibacterial properties</li>
                <li><strong>Vitamins & Minerals:</strong> Including vitamin C, potassium, and iron</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-700">Clinical Studies</h3>
              <p className="text-gray-600 mb-4">
                While more research is needed, preliminary studies suggest Noni may help with:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>Reducing oxidative stress (University of Hawaii study)</li>
                <li>Supporting joint comfort (2009 clinical trial)</li>
                <li>Enhancing immune response (Journal of Ethnopharmacology)</li>
                <li>Improving endurance in athletes (2012 sports medicine study)</li>
              </ul>
              <p className="text-gray-600 mt-4 italic">
                Note: These statements have not been evaluated by food and drug authorities. 
                Noni juice is not intended to diagnose, treat, cure, or prevent any disease.
              </p>
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="bg-green-100 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">How to Use Noni Juice</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Dosage",
                content: "Start with 30ml (2 tablespoons) per day, preferably on an empty stomach. Can gradually increase to 60ml daily."
              },
              {
                title: "Method",
                content: "Drink straight or mix with water/juice. Some prefer to chase it with water due to the strong flavor."
              },
              {
                title: "Best Time",
                content: "Morning before breakfast or evening before bed. Consistency is more important than timing."
              }
            ].map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-green-700">{item.title}</h3>
                <p className="text-gray-600">{item.content}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium">
              Shop Vedamurti Noni Juice
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutNoniPage;