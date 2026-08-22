import React, { useState } from 'react';
import { useSEO } from '../../hooks/useSEO';
import { Link } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, ChevronRight, 
  Calendar, HeartHandshake, ShieldCheck, CheckCircle2,
  Utensils, Trophy, Award, Star, Heart, MessageCircle,
  ExternalLink, Sparkles, Send, ChefHat
} from 'lucide-react';
import { InstagramIcon } from '../components/SocialIcons';
import { restaurantData } from '../../config/restaurantData';
import CateringModal from '../components/CateringModal';
import Footer from '../components/Footer';
import WhatsAppIcon from '../components/WhatsAppIcon';

export default function Landing() {
  useSEO({
    title: 'Order By Bulk - Chat Bhandar | 100% Pure Veg Mumbai Street Food',
    description: "Hyderabad's favourite authentic Mumbai chat — Crispy Pani Puri, Amul Butter Pav Bhaji, Royal Raj Kachori, Bhel Puri & more. Order online or book live catering at MPM Mall, Abids.",
    canonical: 'https://bombaychowpati.com/',
  });
  const [isCateringOpen, setIsCateringOpen] = useState(false);
  const [activeReel, setActiveReel] = useState(null);

  React.useEffect(() => {
    if (window.__bhldScript) return;
    window.__bhldScript = true;
    const d = document;
    const s = d.createElement("script");
    s.type = "module";
    s.src = "https://w.behold.so/widget.js";
    setTimeout(() => {
      d.head.append(s);
    }, 0);
  }, []);



  const handleWhatsAppChat = (customMsg) => {
    const defaultText = `Hello Order By Bulk! I would like to place an order / ask a query.`;
    const text = encodeURIComponent(customMsg || defaultText);
    window.open(`https://wa.me/${restaurantData.whatsappNumber}?text=${text}`, '_blank');
  };



  return (
    <div className="bg-[white] text-[#141B20] relative overflow-hidden font-sans scroll-smooth">

      {/* SECTION 1: HERO SECTION WITH BACKGROUND VIDEO */}
      <section id="hero" className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 overflow-hidden">
        
        {/* Background Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          poster={restaurantData.hero.fallbackImage}
          className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none brightness-110"
        >
          <source src={restaurantData.hero.videoUrl} type="video/mp4" />
        </video>

        {/* Video Gradient Dark Overlay */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141B20]/40 via-transparent to-[#141B20]/40 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in text-[white]">
          
          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-tight leading-none drop-shadow-2xl">
              <span className="text-[#A97E16]">{restaurantData.hero.titleLine1}</span> <br />
              <span className="text-[white] drop-shadow-lg">
                {restaurantData.hero.titleLine2}
              </span>
            </h1>
            <p className="text-[white]/90 text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto font-semibold pt-2">
              {restaurantData.hero.subtitle}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-4 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-3 sm:gap-4 max-w-lg sm:max-w-none mx-auto">
            <Link
              to="/menu?service=FOOD"
              className="bg-[#A97E16] hover:brightness-110 text-white font-black py-3 px-4 rounded-2xl shadow-xl hover:shadow-[#A97E16]/50 transition-all duration-300 flex items-center justify-center text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center"
            >
              <span>Food</span>
            </Link>
            <Link
              to="/menu?service=INSTAMART"
              className="bg-[#A97E16] hover:brightness-110 text-white font-black py-3 px-4 rounded-2xl shadow-xl hover:shadow-[#A97E16]/50 transition-all duration-300 flex items-center justify-center text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center"
            >
              <span>InstaMart</span>
            </Link>
            <Link
              to="/menu?service=DINE_IN"
              className="bg-[#A97E16] hover:brightness-110 text-white font-black py-3 px-4 rounded-2xl shadow-xl hover:shadow-[#A97E16]/50 transition-all duration-300 flex items-center justify-center text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center"
            >
              <span>Dine-in</span>
            </Link>
            <Link
              to="/menu?service=CATERING"
              className="bg-[#A97E16] hover:brightness-110 text-white font-black py-3 px-4 rounded-2xl shadow-xl hover:shadow-[#A97E16]/50 transition-all duration-300 flex items-center justify-center text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center"
            >
              <span>Catering</span>
            </Link>
            <Link
              to="/menu?service=MESS_TIFFIN"
              className="col-span-2 sm:col-span-1 bg-[#A97E16] hover:brightness-110 text-white font-black py-3 px-4 rounded-2xl shadow-xl hover:shadow-[#A97E16]/50 transition-all duration-300 flex items-center justify-center text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center"
            >
              <span>Mess & Tiffin Service</span>
            </Link>
          </div>

        </div>
      </section>

      {/* SECTION 2: FEATURED PRODUCTS */}
      <section id="products" className="py-20 px-4 sm:px-6 bg-[white] border-t border-[#141B20]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-[#141B20]/10 border border-[#141B20]/30 px-3.5 py-1 rounded-full text-xs font-extrabold text-[#141B20] uppercase tracking-wider">
              <Utensils className="w-4 h-4" />
              Our Bestsellers
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#141B20]">
              Featured Products
            </h2>
            <p className="text-[#141B20] text-xs sm:text-sm max-w-xl mx-auto font-light">
              Explore our most loved authentic delicacies, freshly prepared and perfect for your bulk orders.
            </p>
          </div>

          <FeaturedProducts />

        </div>
      </section>

      {/* SECTION 3: DIRECT INSTAGRAM REELS VIDEO SHOWCASE */}
      <section id="reels" className="py-20 px-4 sm:px-6 bg-[white] border-t border-[#141B20]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-[#141B20]/10 border border-[#141B20]/30 px-3.5 py-1 rounded-full text-xs font-extrabold text-[#141B20] uppercase tracking-wider">
                <InstagramIcon className="w-4 h-4" />
                Live Food Reels & Shorts
              </div>
              <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#141B20]">
                Watch Our Instagram Videos
              </h2>
              <p className="text-[#141B20] text-xs sm:text-sm max-w-xl font-light">
                Click play on any reel to watch authentic street food preparation videos right here on our site!
              </p>
            </div>

            <a
              href={restaurantData.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-[#A97E16] hover:brightness-110 text-white font-black py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Follow {restaurantData.instagramHandle}</span>
              <ExternalLink className="w-4 h-4 text-white" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-8">
            {restaurantData.instagramReels?.map((reel) => (
              <div 
                key={reel.id}
                onClick={() => setActiveReel(reel)}
                onMouseEnter={(e) => {
                  const video = e.currentTarget.querySelector('video');
                  if (video) video.play().catch((err) => console.log('Autoplay prevented:', err));
                }}
                onMouseLeave={(e) => {
                  const video = e.currentTarget.querySelector('video');
                  if (video) {
                    video.pause();
                    video.currentTime = 0;
                  }
                }}
                className="group relative aspect-[9/16] bg-gray-950 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-[#141B20]/10 hover:border-[white]/50 hover:-translate-y-1"
              >
                {/* Video element that plays on hover, otherwise shows poster or is paused */}
                <video
                  src={reel.videoUrl}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  loop
                  muted
                  playsInline
                />

                {/* Subtle dark overlay gradient on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

                {/* Minimal Center Play Indicator on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-[white]/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-md">
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 4: ABOUT US / OUR STORY */}
      <section id="about" className="py-20 px-4 sm:px-6 bg-[white] relative border-t border-[#141B20]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Image Side */}
            <div className="relative rounded-3xl overflow-hidden border border-[#A97E16]/30 shadow-xl group aspect-[4/3] sm:aspect-auto sm:h-[450px]">
              <img 
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80" 
                alt="Our Restaurant Story" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="bg-[#A97E16] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Authentic Taste
                </span>
                <h3 className="text-white text-2xl font-serif font-bold mt-2">Serving Authentic Flavors</h3>
              </div>
            </div>

            {/* Text Side */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-[#141B20]/10 border border-[#141B20]/30 px-3.5 py-1 rounded-full text-xs font-extrabold text-[#141B20] uppercase tracking-wider">
                  <ChefHat className="w-4 h-4" />
                  Our Story
                </div>
                <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#141B20]">
                  A Legacy of Pure Taste
                </h2>
              </div>
              
              <div className="space-y-4 text-[#141B20] text-sm sm:text-base font-light leading-relaxed">
                <p>
                  Welcome to <strong>Order By Bulk</strong>, Hyderabad's favorite destination for authentic Mumbai street food. We started with a simple vision: to bring the vibrant, spicy, and tangy flavors of Mumbai's bustling chowpatis directly to your plate, maintaining the highest standards of hygiene and quality.
                </p>
                <p>
                  Every dish we serve is 100% Pure Veg, prepared fresh daily using secret spice blends passed down through generations. From our crispy Pani Puris to our buttery Pav Bhaji, we ensure an unforgettable culinary experience that transports you straight to the streets of Bombay.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#141B20]/10">
                <div>
                  <h4 className="font-black text-2xl text-[#A97E16]">25+</h4>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#141B20]">Years of Trust</p>
                </div>
                <div>
                  <h4 className="font-black text-2xl text-[#A97E16]">100%</h4>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#141B20]">Pure Vegetarian</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5: INFINITE SIDE-SCROLLING TESTIMONIALS */}
      <section className="py-20 bg-[white] border-t border-[#141B20] overflow-hidden">
        <div className="space-y-12">
          
          <div className="text-center space-y-3 px-4">
            <div className="inline-flex items-center gap-1.5 bg-[#141B20]/10 border border-[#141B20]/30 px-3.5 py-1 rounded-full text-xs font-extrabold text-[#141B20] uppercase tracking-wider">
              <Star className="w-4 h-4 fill-current" />
              Guest Experiences & Reviews
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#141B20]">
              What Foodies Say About Us
            </h2>
            <p className="text-[#141B20] text-xs sm:text-sm max-w-xl mx-auto font-light">
              Continuous live feedback from verified guests (Hover over reviews to pause scrolling).
            </p>
          </div>

          {/* Infinite Marquee Side-Scrolling Track */}
          <div className="relative w-full overflow-hidden py-4">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[white] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[white] to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee flex gap-6">
              {/* Duplicated list to create infinite seamless loop */}
              {[...restaurantData.testimonials, ...restaurantData.testimonials].map((review, idx) => (
                <div
                  key={`${review.id}-${idx}`}
                  className="w-80 sm:w-96 bg-white border border-[#141B20]/10 shadow-sm rounded-3xl p-6 shrink-0 space-y-4 hover:shadow-lg hover:border-[#A97E16]/50 transition-all duration-300"
                >
                  <div className="flex text-[#A97E16] gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  <p className="text-[#141B20] text-xs leading-relaxed font-light italic">
                    "{review.comment}"
                  </p>

                  <div className="flex items-center gap-3 pt-3 border-t border-[#141B20]">
                    <div>
                      <h4 className="font-serif font-bold text-xs text-[#141B20]">{review.name}</h4>
                      <span className="text-[10px] text-[#141B20] font-semibold block">{review.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: CLEAN CONTACT & STORE LOCATION SECTION */}
      <section id="contact" className="py-20 px-4 sm:px-6 bg-[white] border-t border-[#141B20] relative">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Clean Section Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#141B20]/10 border border-[#141B20]/30 px-4 py-1.5 rounded-full text-xs font-extrabold text-[#141B20] uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              Store Location & Contact
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#141B20]">
              Visit Order By Bulk
            </h2>
            <p className="text-[#141B20] text-xs sm:text-sm max-w-lg mx-auto font-light">
              Visit our store in Abids, Hyderabad or reach out to us directly via phone, WhatsApp, or Google Maps.
            </p>
          </div>

          {/* Clean 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Clean Contact Details Card (5 Cols) */}
            <div className="lg:col-span-5 bg-[white] border border-[#141B20]/30 rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              
              <div className="space-y-6">
                <h3 className="font-serif font-black text-xl text-[#141B20] border-b border-[#141B20] pb-3">
                  Store Contact Details
                </h3>

                <div className="space-y-5 text-xs text-[#141B20]">
                  {/* Address */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#141B20]/10 border border-[#141B20]/20 flex items-center justify-center text-[#141B20] shrink-0 mt-0.5 shadow-sm">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-[#141B20] uppercase tracking-widest block">Address</span>
                      <a 
                        href={restaurantData.gmbLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[#141B20] hover:text-[#141B20]/70 hover:underline font-semibold text-xs leading-relaxed mt-0.5 block"
                      >
                        {restaurantData.gmbAddress}
                      </a>
                      <span className="text-[11px] text-[#141B20] block mt-0.5">Landmark: {restaurantData.gmbLandmark}</span>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#141B20]/10 border border-[#141B20]/20 flex items-center justify-center text-[#141B20] shrink-0 mt-0.5 shadow-sm">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-[#141B20] uppercase tracking-widest block">Operating Timings</span>
                      <p className="text-[#141B20] font-bold text-xs mt-0.5">{restaurantData.operatingHours}</p>
                    </div>
                  </div>

                  {/* Phone Call */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-[#141B20]/10 border border-[#141B20]/20 flex items-center justify-center text-[#141B20] shrink-0 mt-0.5 shadow-sm">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-[#141B20] uppercase tracking-widest block">Phone Number</span>
                      <a href={`tel:${restaurantData.supportPhone}`} className="text-[#141B20] hover:text-[#141B20]/70 font-bold text-sm mt-0.5 block transition-colors">
                        {restaurantData.formattedPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <a
                  href={restaurantData.gmbLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#A97E16]/10 hover:bg-[#A97E16] text-[#141B20] hover:text-white font-black py-3.5 px-6 rounded-2xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer border border-[#A97E16]/40"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Google Maps Profile</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => handleWhatsAppChat()}
                  className="w-full bg-[#A97E16] hover:brightness-110 text-white font-black py-3.5 px-6 rounded-2xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
                >
                  <WhatsAppIcon className="w-4.5 h-4.5" color="currentColor" />
                  <span>Chat on WhatsApp</span>
                </button>
              </div>

            </div>

            {/* Right Column: Clean Map Iframe (7 Cols) */}
            <div className="lg:col-span-7 bg-[white] border border-[#141B20]/30 rounded-3xl overflow-hidden min-h-[420px] relative">
              <iframe
                title="Order By Bulk Store Google Map Location"
                src={restaurantData.googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '420px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>

          </div>

        </div>
      </section>

      {/* RICH MULTI-COLUMN FOOTER */}
      <Footer onOpenCatering={() => setIsCateringOpen(true)} />

      {/* Catering Modal */}
      <CateringModal 
        isOpen={isCateringOpen} 
        onClose={() => setIsCateringOpen(false)} 
      />

      {/* Video Lightbox Modal */}
      {activeReel && (
        <div 
          onClick={() => setActiveReel(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-center items-center p-4 cursor-zoom-out animate-fade-in"
        >
          {/* Close Button */}
          <button 
            onClick={() => setActiveReel(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-[white]/10 hover:bg-[white]/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer text-xl font-bold shadow-lg z-10"
          >
            ✕
          </button>
          
          <div className="relative max-w-lg w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
            <video 
              src={activeReel.videoUrl}
              className="w-full h-full object-contain"
              autoPlay
              controls
              loop
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedProducts() {
  const products = [
    {
      id: 1,
      name: "Special Pani Puri Bulk Pack",
      description: "Crispy puris with our signature spicy and sweet water, perfect for your party.",
      price: "₹499",
      image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80",
      tag: "Best Seller"
    },
    {
      id: 2,
      name: "Amul Butter Pav Bhaji",
      description: "Mumbai style spicy vegetable mash served with soft butter-toasted buns.",
      price: "₹349",
      image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80",
      tag: "Must Try"
    },
    {
      id: 3,
      name: "Royal Raj Kachori",
      description: "Crispy giant puri stuffed with potatoes, sprouts, yogurt and sweet chutneys.",
      price: "₹199",
      image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80",
      tag: "Chef's Special"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map(product => (
        <div key={product.id} className="bg-white rounded-3xl overflow-hidden border border-[#141B20]/10 shadow-sm hover:shadow-xl transition-all duration-300 group">
          <div className="relative h-48 sm:h-56 overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute top-4 right-4 bg-[#A97E16] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              {product.tag}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-serif font-black text-xl text-[#141B20] mb-2">{product.name}</h3>
              <p className="text-[#141B20] text-xs font-light leading-relaxed line-clamp-2">{product.description}</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#141B20]/10">
              <span className="font-black text-lg text-[#A97E16]">{product.price}</span>
              <Link to="/menu" className="text-xs font-bold text-[#141B20] hover:text-[#A97E16] transition-colors flex items-center gap-1 uppercase tracking-wider">
                Order Now <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
