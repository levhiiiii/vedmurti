import { FaLeaf, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';
import { IoMdMail } from 'react-icons/io';
import { FiPhoneCall } from 'react-icons/fi';
import { MdLocationOn } from 'react-icons/md';

const Footer = () => {
  return (
    <footer className="bg-green-800  text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-3xl text-green-300" />
              <span className="text-2xl font-bold">
                Vedamurti <span className="text-green-300">Noni</span>
              </span>
            </div>
            <p className="text-green-100">
              Pure, organic Noni Juice for holistic wellness. Harnessing nature's power for your health.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-green-200 hover:text-white transition-colors">
                <FaFacebook className="text-xl" />
              </a>
              <a href="#" className="text-green-200 hover:text-white transition-colors">
                <FaInstagram className="text-xl" />
              </a>
              <a href="#" className="text-green-200 hover:text-white transition-colors">
                <FaTwitter className="text-xl" />
              </a>
              <a href="#" className="text-green-200 hover:text-white transition-colors">
                <FaYoutube className="text-xl" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-green-700 pb-2">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Shop
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  About Noni
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Health Benefits
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Testimonials
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-green-700 pb-2">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  My Account
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Order Tracking
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Shipping Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  Returns & Refunds
                </a>
              </li>
              <li>
                <a href="#" className="text-green-100 hover:text-white transition-colors">
                  FAQs
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-green-700 pb-2">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MdLocationOn className="text-xl text-green-300 mt-1" />
                <p className="text-green-100">
                  123 Wellness Street, Organic City, IN 560001
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <IoMdMail className="text-xl text-green-300" />
                <a href="mailto:info@vedamurtinoni.com" className="text-green-100 hover:text-white transition-colors">
                  info@vedamurtinoni.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <FiPhoneCall className="text-xl text-green-300" />
                <a href="tel:+919876543210" className="text-green-100 hover:text-white transition-colors">
                  +91 98765 43210
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 border-t border-green-700 pt-8">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-semibold mb-4">Subscribe to Our Newsletter</h3>
            <p className="text-green-100 mb-6">
              Get updates on special offers, health tips, and new products.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-grow px-4 py-2 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-green-700 text-center text-green-200 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Vedamurti Noni Juice. All Rights Reserved.
          </p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;