import { FaQuoteLeft, FaStar, FaRegStar } from 'react-icons/fa';
import { GiHealthPotion } from 'react-icons/gi';

const TestimonialsPage = () => {

  // Written testimonials
  const writtenTestimonials = [
    {
      id: 1,
      name: "Rajesh K.",
      location: "Bangalore",
      role: "Diabetes Management",
      avatar: "/testimonials/user-1.jpg",
      rating: 5,
      content: "After 3 months of Vedamurti Noni Juice, my fasting sugar levels dropped from 180 to 110. My doctor was amazed! I've reduced my medication by half and feel more energetic than I have in years.",
      date: "March 15, 2023"
    },
    {
      id: 2,
      name: "Priya M.",
      location: "Mumbai",
      role: "Arthritis Relief",
      avatar: "/testimonials/user-2.jpg",
      rating: 5,
      content: "I suffered from knee pain for 8 years. Within 6 weeks of taking Noni Juice daily, the swelling reduced significantly. Now I can climb stairs without pain. This juice is magical!",
      date: "January 28, 2023"
    },
    {
      id: 3,
      name: "Dr. Arun S.",
      location: "Delhi",
      role: "Cardiologist",
      avatar: "/testimonials/user-3.jpg",
      rating: 4,
      content: "While I always recommend consulting your physician first, I've observed several patients show remarkable improvement in blood pressure and cholesterol levels after incorporating Noni Juice into their diet.",
      date: "November 5, 2022"
    },
    {
      id: 4,
      name: "Sunita R.",
      location: "Chennai",
      role: "Skin Health",
      avatar: "/testimonials/user-4.jpg",
      rating: 5,
      content: "My chronic eczema cleared up after 2 months of Noni Juice. I've tried everything - steroids, creams, you name it. Nothing worked like this natural solution. My skin hasn't looked this good since I was 20!",
      date: "September 18, 2022"
    },
    {
      id: 5,
      name: "Vikram J.",
      location: "Hyderabad",
      role: "Athletic Performance",
      avatar: "/testimonials/user-5.jpg",
      rating: 5,
      content: "As a marathon runner, I use Noni Juice for recovery. My muscle soreness has decreased dramatically, and I've cut my recovery time in half. Plus my immunity has improved - no more colds before races!",
      date: "August 3, 2022"
    },
    {
      id: 6,
      name: "Meena P.",
      location: "Pune",
      role: "Digestive Health",
      avatar: "/testimonials/user-6.jpg",
      rating: 4,
      content: "After years of IBS struggles, Vedamurti Noni Juice has given me regular digestion for the first time in decades. The bloating and discomfort are gone. I'm a customer for life!",
      date: "June 22, 2022"
    }
  ];

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          i < rating 
            ? <FaStar key={i} className="text-yellow-400" /> 
            : <FaRegStar key={i} className="text-yellow-400" />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-green-50 pt-15 min-h-screen">
      {/* Hero Section */}
      <div className="bg-green-700 text-white py-16 text-center">
        <div className="container mx-auto px-4">
          <div className="flex justify-center mb-4">
            <GiHealthPotion className="text-4xl text-green-300" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Real Stories, Real Results</h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto">
            Discover how Vedamurti Noni Juice has transformed thousands of lives
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Stats Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4">
            <div className="text-3xl font-bold text-green-600">10,000+</div>
            <div className="text-gray-600">Happy Customers</div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-green-600">96%</div>
            <div className="text-gray-600">Would Recommend</div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-green-600">4.8/5</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-green-600">15+</div>
            <div className="text-gray-600">Years in Business</div>
          </div>
        </div>

        

        {/* Written Testimonials */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Customer Experiences</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {writtenTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <p className="text-sm text-gray-600">
                      {testimonial.location} • {testimonial.role}
                    </p>
                  </div>
                </div>
                <div className="mb-3">
                  {renderStars(testimonial.rating)}
                </div>
                <div className="relative mb-4">
                  <FaQuoteLeft className="text-green-200 text-3xl absolute -top-2 -left-1" />
                  <p className="text-gray-700 pl-8 italic">
                    {testimonial.content}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {testimonial.date}
                </div>
              </div>
            ))}
          </div>
        </section>



        {/* CTA Section */}
        <section className="bg-green-100 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Experience the Difference?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of satisfied customers who have transformed their health with Vedamurti Noni Juice
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg">
            Try Noni Juice Now
          </button>
        </section>
      </div>
    </div>
  );
};

export default TestimonialsPage;