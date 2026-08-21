import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, Instagram, Send, ExternalLink, 
  ShieldCheck, Utensils, Award, Heart, CheckCircle2,
  Facebook, Twitter, Youtube, Link as LinkIcon
} from 'lucide-react';
import { restaurantData } from '../../config/restaurantData';
const logoBanner = '/lok.png';
import WhatsAppIcon from './WhatsAppIcon';

export default function Footer({ onOpenCatering }) {
  const handleWhatsAppChat = () => {
    const text = encodeURIComponent(`Hello Order By Bulk! I would like to place an order / ask a query.`);
    window.open(`https://wa.me/${restaurantData.whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <footer className="bg-white text-[#141B20] border-t border-[#141B20]/10 relative overflow-hidden font-sans">
      {/* Top Gold Border Highlight */}
      <div className="h-1 w-full bg-gradient-to-r from-[#F15A25]/20 via-[#F15A25] to-[#F15A25]/20" />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Column 1: Brand & Bio (2 Spans) */}
          <div className="lg:col-span-2 space-y-5">
            <Link to="/" className="inline-block">
              <img 
                src={logoBanner} 
                alt="Order By Bulk Chat Bhandar" 
                className="h-12 w-auto object-contain drop-shadow-sm scale-[1.6] origin-left"
              />
            </Link>
            
            <p className="text-[#141B20]/80 text-xs leading-relaxed max-w-sm font-light">
              {restaurantData.description}
            </p>

            {/* 100% Pure Veg Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-600">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Pure Vegetarian Guarantee</span>
            </div>

            {/* Social Links */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/orderbybulk?igsh=MTdkbmI4cHNhMGxndg==&igsi=MTdkbmI4cHNhMGxndg=="
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md"
                title="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/share/1GS5PpauNB/"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md"
                title="Follow us on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>

              {/* X (Twitter) */}
              <a
                href="https://x.com/OrderByBulk"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md"
                title="Follow us on X"
              >
                <Twitter className="w-5 h-5" />
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@orderbybulk?si=A5oWv_4PYEmXj9_D"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md"
                title="Subscribe on YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>

              {/* Threads */}
              <a
                href="https://www.threads.com/@orderbybulk"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md text-xs font-black"
                title="Follow us on Threads"
              >
                @
              </a>

              {/* Pinterest */}
              <a
                href="https://pin.it/3oB9FgYln"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md text-xs font-black"
                title="Follow us on Pinterest"
              >
                P
              </a>

              {/* WhatsApp (Keep existing) */}
              <button
                onClick={handleWhatsAppChat}
                className="w-10 h-10 rounded-xl bg-[#F15A25] hover:brightness-110 text-white border-0 flex items-center justify-center transition-all shadow-md cursor-pointer"
                title="Chat on WhatsApp"
              >
                <WhatsAppIcon className="w-5 h-5" color="currentColor" />
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="font-serif font-black text-sm text-[#141B20] uppercase tracking-widest border-b border-[#141B20]/10 pb-2">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs text-[#141B20]/80">
              {restaurantData.footerSections.quickLinks.map((link, idx) => (
                <li key={idx}>
                  {link.path.startsWith('/#') ? (
                    <button 
                      onClick={onOpenCatering} 
                      className="hover:text-[#F15A25] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="text-[#F15A25]">›</span> {link.name}
                    </button>
                  ) : (
                    <Link to={link.path} className="hover:text-[#F15A25] transition-colors flex items-center gap-1.5">
                      <span className="text-[#F15A25]">›</span> {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Our Services */}
          <div className="space-y-4">
            <h4 className="font-serif font-black text-sm text-[#141B20] uppercase tracking-widest border-b border-[#141B20]/10 pb-2">
              Our Services
            </h4>
            <ul className="space-y-2.5 text-xs text-[#141B20]/80">
              {restaurantData.footerSections.topSpecialties.map((item, idx) => (
                <li key={idx}>
                  <Link to={item.path} className="hover:text-[#F15A25] transition-colors flex items-center gap-1.5">
                    <span className="text-[#F15A25]">›</span> {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact & Operating Hours */}
          <div className="space-y-4">
            <h4 className="font-serif font-black text-sm text-[#141B20] uppercase tracking-widest border-b border-[#141B20]/10 pb-2">
              Store Location
            </h4>
            <div className="space-y-3 text-xs text-[#141B20]/80">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F15A25] shrink-0 mt-0.5" />
                <a 
                  href={restaurantData.gmbLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-[#F15A25] hover:underline transition-colors"
                >
                  {restaurantData.gmbAddress}
                </a>
              </p>
              
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{restaurantData.operatingHours}</span>
              </p>

              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#F15A25] shrink-0" />
                <a href={`tel:${restaurantData.supportPhone}`} className="hover:text-[#F15A25]">
                  {restaurantData.formattedPhone}
                </a>
              </p>

              <div className="pt-2">
                <a
                  href={restaurantData.gmbLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#F15A25] hover:brightness-110 border-0 px-3 py-2 rounded-xl text-[11px] font-bold text-white transition-all shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps Location</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-50 border-t border-[#141B20]/10 py-6 px-4 text-center text-xs text-[#141B20]/70">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-[11px] text-[#141B20]/80">
            &copy; {new Date().getFullYear()} {restaurantData.footerText}
          </div>

          <div className="text-[11px] text-[#141B20]/60">
            Maintained &amp; Developed by{' '}
            <a 
              href={restaurantData.developerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#141B20] hover:text-[#F15A25] hover:underline font-bold transition-colors"
            >
              {restaurantData.developerCompany}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
