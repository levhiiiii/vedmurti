import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';

const ContactPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    alert('Thank you for your message! We will contact you soon.');
  };

  return (
    <div className="bg-green-50 pt-15 min-h-screen">
      {/* Hero Section */}
      <div className="bg-green-700 text-white py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Vedamurti</h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto">
            We'd love to hear from you! Reach out for inquiries, wholesale orders, or health advice.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className=" md:px-20 px-4 mx-auto  py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Get in Touch</h2>
            <div className="h-0.5 w-full bg-gray-100 mb-8  rounded-2xl">

</div>
            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-start">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <FaPhone className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Call Us</h3>
                  <p className="text-gray-600">
                    <a href="tel:+919876543210" className="hover:text-green-600 transition-colors">
                      +91 98765 43210
                    </a>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Monday-Saturday, 9AM-6PM</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <FaEnvelope className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Email Us</h3>
                  <p className="text-gray-600">
                    <a href="mailto:info@vedamurti.com" className="hover:text-green-600 transition-colors">
                      info@vedamurti.com
                    </a>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Response within 24 hours</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <FaMapMarkerAlt className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Visit Us</h3>
                  <p className="text-gray-600">
                    Vedamurti Wellness Center<br />
                    123 Organic Farms Road<br />
                    Bengaluru, Karnataka 560001
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start">
                <div className="bg-green-100 p-3 rounded-full mr-4">
                  <FaClock className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Operating Hours</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li className="flex justify-between max-w-xs">
                      <span>Monday-Friday :</span> <span> 9:00 AM - 6:00 PM</span>
                    </li>
                    <li className="flex justify-between max-w-xs">
                      <span>Saturday : </span> <span>10:00 AM - 4:00 PM</span>
                    </li>
                    <li className="flex justify-between max-w-xs">
                      <span>Sunday : </span> <span>Closed</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Social Media */}
              <div className="pt-4 w-full flex flex-col items-center">
               <div className="h-0.5 w-full bg-gray-100 mb-10 rounded-2xl">

               </div>
                <div className="flex space-x-4">
                  <a href="#" className="bg-green-100 p-3 rounded-full text-green-600 hover:bg-green-200 transition-colors">
                    <FaFacebook className="text-xl" />
                  </a>
                  <a href="#" className="bg-green-100 p-3 rounded-full text-green-600 hover:bg-green-200 transition-colors">
                    <FaInstagram className="text-xl" />
                  </a>
                  <a href="#" className="bg-green-100 p-3 rounded-full text-green-600 hover:bg-green-200 transition-colors">
                    <FaTwitter className="text-xl" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-gray-700 mb-1">Full Name*</label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-gray-700 mb-1">Email*</label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-gray-700 mb-1">Subject*</label>
                  <select
                    id="subject"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a topic</option>
                    <option value="product">Product Inquiry</option>
                    <option value="order">Order Status</option>
                    <option value="wholesale">Wholesale Inquiry</option>
                    <option value="health">Health Questions</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-gray-700 mb-1">Message*</label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium w-full transition-colors"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-16 bg-white rounded-xl shadow-md overflow-hidden">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.123456789012!2d77.5945678!3d12.9715987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzEzLjgiTiA3N8KwMzUnNDAuNCJF!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Vedamurti Location"
            className="w-full"
          ></iframe>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="space-y-4">
              {[
                {
                  question: "How soon can I expect a response to my inquiry?",
                  answer: "We typically respond to all inquiries within 24 hours during business days. For urgent matters, please call our customer service number."
                },
                {
                  question: "Do you offer wholesale pricing?",
                  answer: "Yes, we offer special pricing for bulk orders. Please select 'Wholesale Inquiry' in the contact form or email us directly at wholesale@vedamurti.com."
                },
                {
                  question: "Can I visit your facility to purchase products directly?",
                  answer: "Yes! Our Bengaluru wellness center is open Monday-Saturday. See our operating hours above for details."
                },
                {
                  question: "Do you ship internationally?",
                  answer: "Currently we ship throughout India. For international orders, please contact us for availability in your country."
                }
              ].map((item, index) => (
                <div key={index} className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">{item.question}</h3>
                  <p className="text-gray-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;