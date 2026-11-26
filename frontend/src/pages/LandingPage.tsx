// src/pages/LandingPage.tsx
import { Link } from 'react-router-dom';
import { 
  Hospital, 
  Users, 
  FileText, 
  DollarSign, 
  BedDouble, 
  Shield, 
  ArrowRight,
  CheckCircle,
  Stethoscope,
  Activity,
  Phone,
  Mail,
  MapPin,
  Package,
  BarChart3
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-main)", color: "var(--text-primary)" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--icon-cyan-bg)", color: "var(--icon-cyan-text)" }}>
                <Hospital className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>HMS</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 rounded-lg transition-colors text-sm font-semibold" style={{ background: "var(--icon-cyan-bg)", color: "var(--icon-cyan-text)" }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: "var(--icon-cyan-bg)", color: "var(--icon-cyan-text)" }}>
            <Shield className="w-4 h-4" />
            Trusted by 50+ Hospitals
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Modern Hospital Management
            <span className="block" style={{ color: "var(--icon-cyan-text)" }}>Made Simple</span>
          </h1>
          <p className="text-base md:text-lg max-w-3xl mx-auto mb-7 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Streamline patient care, billing, pharmacy, lab, and admissions with our all-in-one cloud-based HMS.
            Secure, fast, and built for healthcare professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg transition-all font-semibold text-sm" style={{ background: "var(--icon-cyan-bg)", color: "var(--icon-cyan-text)" }}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border transition-all font-semibold text-sm" style={{ background: "var(--bg-card)", color: "var(--icon-cyan-text)", borderColor: "var(--icon-cyan-text)" }}
            >
              <Activity className="w-5 h-5" />
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-14 border-y" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-9">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Everything You Need in One Platform
            </h2>
            <p className="text-sm md:text-base max-w-3xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              From patient registration to discharge — manage your hospital efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                icon: Users,
                title: "Patient Management",
                desc: "Register, track, and manage patient records with NHIS & private insurance support."
              },
              {
                icon: FileText,
                title: "Clinical Records",
                desc: "Digital attendance, vitals, diagnosis, medications, lab & scan orders."
              },
              {
                icon: DollarSign,
                title: "Smart Billing",
                desc: "Auto-generate bills, track payments, insurance claims, and outstanding balances."
              },
              {
                icon: Package,
                title: "Pharmacy & Stock",
                desc: "Inventory tracking, low stock alerts, dispensing, and expiry management."
              },
              {
                icon: BedDouble,
                title: "Admissions & Wards",
                desc: "Bed allocation, ward management, admission notes, and discharge summaries."
              },
              {
                icon: BarChart3,
                title: "Reports & Analytics",
                desc: "Daily attendances, revenue, patient trends, and custom reports."
              },
            ].map((feature, i) => (
              <div key={i} className="p-5 rounded-xl border transition-shadow hover:shadow-md" style={{ background: "var(--bg-main)", borderColor: "var(--border-color)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--icon-cyan-bg)", color: "var(--icon-cyan-text)" }}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-10" style={{ background: "var(--bg-main)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Trusted by leading healthcare providers</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-70">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-24 h-12 rounded-lg border border-dashed" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-14" style={{ background: "var(--icon-cyan-bg)" }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Ready to Transform Your Hospital?
          </h2>
          <p className="text-sm md:text-base mb-7" style={{ color: "var(--text-secondary)" }}>
            Join hundreds of clinics already using HMS to save time and improve care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg transition-all font-semibold text-sm" style={{ background: "var(--bg-card)", color: "var(--icon-cyan-text)" }}
            >
              Start 14-Day Free Trial
              <CheckCircle className="w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border transition-all font-semibold text-sm" style={{ borderColor: "var(--icon-cyan-text)", color: "var(--icon-cyan-text)" }}
            >
              <Phone className="w-5 h-5" />
              Contact Sales
            </Link>
          </div>
          <p className="mt-5 text-xs" style={{ color: "var(--text-secondary)" }}>
            No credit card required • Setup in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--icon-cyan-bg)", color: "var(--icon-cyan-text)" }}>
                  <Hospital className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>HMS</h3>
              </div>
              <p className="text-sm leading-relaxed">
                Modern hospital management for the digital age.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="hover:opacity-80">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/security" className="hover:text-white">Security</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  support@hms.app
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +233 50 000 0000
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Accra, Ghana
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-7 pt-6 border-t text-center text-xs" style={{ borderColor: "var(--border-color)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>&copy; 2025 HMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
