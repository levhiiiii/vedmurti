import { FaLeaf, FaArrowRight } from 'react-icons/fa';
import { MdHealthAndSafety } from 'react-icons/md';
import { GiHeartBottle } from 'react-icons/gi';
import Bottle from '../assets/NoniBottle.png'

const HeroSection = () => {
  return (
    <section className="relative p-5 bg-green-50 md:pt-0 pt-20 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/path-to-leaf-pattern.svg')] bg-repeat"></div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Content */}
          <div className="lg:w-1/2 mb-12 lg:mb-0 lg:pr-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 mb-4">
              <FaLeaf className="mr-2" />
              <span className="text-sm font-medium">100% Organic</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight mb-6">
              Pure <span className="text-green-600">Noni Juice</span> for Holistic Wellness
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Discover the ancient healing power of Noni Juice. Our premium, cold-pressed formula 
              delivers maximum health benefits to boost your immunity and vitality.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl">
                Shop Now <FaArrowRight className="ml-2" />
              </button>
              <button className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-lg font-medium flex items-center justify-center transition-all duration-300">
                Learn Benefits
              </button>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center">
                <MdHealthAndSafety className="text-3xl text-green-600 mr-3" />
                <span className="text-gray-700">Boosts Immunity</span>
              </div>
              <div className="flex items-center">
                <GiHeartBottle className="text-3xl text-green-600 mr-3" />
                <span className="text-gray-700">100% Natural</span>
              </div>
            </div>
          </div>

          {/* Product Image */}
          <div className="lg:w-1/2 relative flex justify-center ">
            <div className="relative max-w-md mx-auto lg:mx-0 bg-green-600 rounded-full animate-float1">
              {/* Main product image with shadow */}
              {/* <div className="relative z-10">
                <img 
                  src={Bottle}
                  alt="Vedamurti Noni Juice Bottle"
                  className="w-full h-auto max-h-[500px] object-contain drop-shadow-2xl"
                />
              </div> */}
              
              {/* Decorative elements */}
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-green-700 rounded-full opacity-30 animate-float1"></div>
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-600 rounded-full opacity-30 animate-float2"></div>
              
              {/* Floating leaves decoration */}
              <img 
                src={Bottle}
                alt=""
                className="absolut animate-float"
              />
            </div>
          </div>
        </div>
      </div>

     
    </section>
  );
};

export default HeroSection;